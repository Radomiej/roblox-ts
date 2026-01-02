import luau from "@roblox-ts/luau-ast";
import { TransformState } from "TSTransformer";
import { transformStatement } from "TSTransformer/nodes/statements/transformStatement";
import {
	isAwaitUsingDeclaration,
	isUsingDeclaration,
	transformVariableDeclarationList,
	UsingDeclarationInfo,
} from "TSTransformer/nodes/statements/transformVariableStatement";
import { createHoistDeclaration } from "TSTransformer/util/createHoistDeclaration";
import ts from "typescript";

/**
 * Creates dispose statements for using declarations in reverse order (LIFO)
 * For await using, uses Symbol.asyncDispose with fallback to Symbol.dispose
 */
function createDisposeStatements(state: TransformState, usingDeclarations: Array<UsingDeclarationInfo>, node: ts.Node) {
	const disposeStatements = luau.list.make<luau.Statement>();

	// Dispose in reverse order (LIFO) - last declared, first disposed
	for (let i = usingDeclarations.length - 1; i >= 0; i--) {
		const { id, isAwait } = usingDeclarations[i];
		const symbolDispose = luau.property(state.TS(node, "Symbol"), "dispose");
		const symbolAsyncDispose = luau.property(state.TS(node, "Symbol"), "asyncDispose");

		if (isAwait) {
			// For await using: try asyncDispose first, then dispose as fallback
			// local disposeMethod = resource[Symbol.asyncDispose] or resource[Symbol.dispose]
			// if disposeMethod then disposeMethod(resource) end
			const disposeMethodId = luau.tempId("disposeMethod");
			const innerStatements = luau.list.make<luau.Statement>();
			luau.list.push(
				innerStatements,
				luau.create(luau.SyntaxKind.VariableDeclaration, {
					left: disposeMethodId,
					right: luau.binary(
						luau.create(luau.SyntaxKind.ComputedIndexExpression, {
							expression: id,
							index: symbolAsyncDispose,
						}),
						"or",
						luau.create(luau.SyntaxKind.ComputedIndexExpression, {
							expression: id,
							index: symbolDispose,
						}),
					),
				}),
			);
			luau.list.push(
				innerStatements,
				luau.create(luau.SyntaxKind.IfStatement, {
					condition: disposeMethodId,
					statements: luau.list.make(
						luau.create(luau.SyntaxKind.CallStatement, {
							expression: luau.call(disposeMethodId, [id]),
						}),
					),
					elseBody: luau.list.make(),
				}),
			);
			const disposeCheck = luau.create(luau.SyntaxKind.IfStatement, {
				condition: luau.binary(id, "~=", luau.nil()),
				statements: innerStatements,
				elseBody: luau.list.make(),
			});
			luau.list.push(disposeStatements, disposeCheck);
		} else {
			// For regular using: use Symbol.dispose
			// if resource ~= nil then
			//     if resource[Symbol.dispose] then resource[Symbol.dispose](resource) end
			// end
			const disposeCheck = luau.create(luau.SyntaxKind.IfStatement, {
				condition: luau.binary(id, "~=", luau.nil()),
				statements: luau.list.make(
					luau.create(luau.SyntaxKind.IfStatement, {
						condition: luau.create(luau.SyntaxKind.ComputedIndexExpression, {
							expression: id,
							index: symbolDispose,
						}),
						statements: luau.list.make(
							luau.create(luau.SyntaxKind.CallStatement, {
								expression: luau.call(
									luau.create(luau.SyntaxKind.ComputedIndexExpression, {
										expression: id,
										index: symbolDispose,
									}),
									[id],
								),
							}),
						),
						elseBody: luau.list.make(),
					}),
				),
				elseBody: luau.list.make(),
			});
			luau.list.push(disposeStatements, disposeCheck);
		}
	}

	return disposeStatements;
}

function addFinalizersToIfStatement(node: luau.IfStatement, finalizers: luau.List<luau.Statement>) {
	if (luau.list.isNonEmpty(node.statements)) {
		addFinalizers(node.statements, node.statements.head, finalizers);
	}
	if (luau.list.isList(node.elseBody)) {
		if (luau.list.isNonEmpty(node.elseBody)) {
			addFinalizers(node.elseBody, node.elseBody.head, finalizers);
		}
	} else {
		addFinalizersToIfStatement(node.elseBody, finalizers);
	}
}

function addFinalizers(
	list: luau.List<luau.Statement>,
	node: luau.ListNode<luau.Statement>,
	finalizers: luau.List<luau.Statement>,
) {
	const statement = node.value;
	if (luau.isFinalStatement(statement)) {
		const finalizersClone = luau.list.clone(finalizers);

		luau.list.forEach(finalizersClone, node => (node.parent = statement.parent));

		if (node.prev) {
			node.prev.next = finalizersClone.head;
		} else if (node === list.head) {
			list.head = finalizersClone.head;
		}

		node.prev = finalizersClone.tail;
		finalizersClone.tail!.next = node;
	}

	if (luau.isDoStatement(statement)) {
		if (luau.list.isNonEmpty(statement.statements)) {
			addFinalizers(statement.statements, statement.statements.head, finalizers);
		}
	} else if (luau.isIfStatement(statement)) {
		addFinalizersToIfStatement(statement, finalizers);
	}

	if (node.next) {
		addFinalizers(list, node.next, finalizers);
	}
}

function getLastToken(parent: ts.Node | undefined, statements: ReadonlyArray<ts.Statement>) {
	if (statements.length > 0) {
		const lastStatement = statements[statements.length - 1];
		const lastToken = lastStatement.parent.getLastToken();
		if (lastToken && !ts.isNodeDescendantOf(lastToken, lastStatement)) {
			return lastToken;
		}
	} else if (parent) {
		// if statements is empty, there still might be an `EOF` or `}` token to look for
		return parent.getLastToken();
	}
}

/**
 * Convert a ts.Statement array into a luau.list<...> tree
 * @param state The current state of the transformation.
 * @param statements The statements to transform into a `luau.list<...>`.
 * @param exportInfo Information about exporting.
 */
export function transformStatementList(
	state: TransformState,
	parent: ts.Node | undefined,
	statements: ReadonlyArray<ts.Statement>,
	exportInfo?: {
		id: luau.AnyIdentifier;
		mapping: Map<ts.Statement, Array<string>>;
	},
) {
	// make a new Luau tree
	const result = luau.list.make<luau.Statement>();

	// Track using declarations in this scope for disposal
	const usingDeclarations: Array<UsingDeclarationInfo> = [];

	// iterate through each statement in the `statements` array
	for (const statement of statements) {
		// Special handling for using declarations
		if (ts.isVariableStatement(statement)) {
			const declList = statement.declarationList;
			if (isUsingDeclaration(declList) || isAwaitUsingDeclaration(declList)) {
				// Transform using declaration and track for disposal
				const [transformedStatements, prereqStatements] = state.capture(() =>
					transformVariableDeclarationList(state, declList, usingDeclarations),
				);

				if (state.compilerOptions.removeComments !== true) {
					luau.list.pushList(result, state.getLeadingComments(statement));
				}

				const hoistDeclaration = createHoistDeclaration(state, statement);
				if (hoistDeclaration) {
					luau.list.push(result, hoistDeclaration);
				}

				luau.list.pushList(result, prereqStatements);
				luau.list.pushList(result, transformedStatements);
				continue;
			}
		}

		// capture prerequisite statements for the `ts.Statement`
		// transform the statement into a luau.List<...>
		const [transformedStatements, prereqStatements] = state.capture(() => transformStatement(state, statement));

		// iterate through each of the leading comments of the statement
		if (state.compilerOptions.removeComments !== true) {
			luau.list.pushList(result, state.getLeadingComments(statement));
		}

		// check statement for hoisting
		// hoisting is the use of a variable before it was declared
		const hoistDeclaration = createHoistDeclaration(state, statement);
		if (hoistDeclaration) {
			luau.list.push(result, hoistDeclaration);
		}

		luau.list.pushList(result, prereqStatements);
		luau.list.pushList(result, transformedStatements);

		const lastStatement = transformedStatements.tail?.value;
		if (lastStatement && luau.isFinalStatement(lastStatement)) {
			break;
		}

		// namespace export handling
		if (exportInfo) {
			const containerId = exportInfo.id;
			const exportMapping = exportInfo.mapping.get(statement);
			if (exportMapping !== undefined) {
				for (const exportName of exportMapping) {
					luau.list.push(
						result,
						luau.create(luau.SyntaxKind.Assignment, {
							left: luau.property(containerId, exportName),
							operator: "=",
							right: luau.id(exportName),
						}),
					);
				}
			}
		}
	}

	if (usingDeclarations.length > 0 && parent) {
		const disposeStatements = createDisposeStatements(state, usingDeclarations, parent);
		if (result.head && luau.list.isNonEmpty(disposeStatements)) {
			addFinalizers(result, result.head, disposeStatements);
		}

		if (!result.tail || !luau.isFinalStatement(result.tail.value)) {
			luau.list.pushList(result, disposeStatements);
		}
	}

	if (state.compilerOptions.removeComments !== true) {
		const lastToken = getLastToken(parent, statements);
		if (lastToken) {
			luau.list.pushList(result, state.getLeadingComments(lastToken));
		}
	}

	return result;
}
