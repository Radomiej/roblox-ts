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

function createDisposeStatements(state: TransformState, declarations: Array<UsingDeclarationInfo>, node: ts.Node) {
	const statements = luau.list.make<luau.Statement>();
	for (let i = declarations.length - 1; i >= 0; i--) {
		const { id, isAwait } = declarations[i];
		luau.list.push(
			statements,
			luau.create(luau.SyntaxKind.CallStatement, {
				expression: luau.call(state.TS(node, "disposeResource"), [id, luau.bool(isAwait)]),
			}),
		);
	}
	return statements;
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
	const isErrorCall =
		luau.isCallStatement(statement) &&
		luau.isCall(statement.expression) &&
		luau.isIdentifier(statement.expression.expression) &&
		statement.expression.expression.name === "error";

	if (luau.isFinalStatement(statement) || isErrorCall) {
		const inserted = luau.list.make<luau.Statement>();
		if (luau.isReturnStatement(statement) && statement.expression !== undefined) {
			const values = luau.list.isList(statement.expression)
				? luau.list.toArray(statement.expression)
				: [statement.expression];
			const packed = luau.tempId("returnValues");
			luau.list.push(
				inserted,
				luau.create(luau.SyntaxKind.VariableDeclaration, {
					left: packed,
					right: luau.call(luau.globals.table.pack, values),
				}),
			);
			statement.expression = luau.call(luau.globals.table.unpack, [
				packed,
				luau.number(1),
				luau.property(packed, "n"),
			]);
		}
		const finalizersClone = luau.list.clone(finalizers);
		luau.list.pushList(inserted, finalizersClone);
		luau.list.forEach(inserted, child => (child.parent = statement.parent));

		if (node.prev) {
			node.prev.next = inserted.head;
		} else {
			list.head = inserted.head;
		}
		inserted.head!.prev = node.prev;
		node.prev = inserted.tail;
		inserted.tail!.next = node;
	}

	if (luau.isDoStatement(statement) && luau.list.isNonEmpty(statement.statements)) {
		addFinalizers(statement.statements, statement.statements.head, finalizers);
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
	const usingDeclarations: Array<UsingDeclarationInfo> = [];

	// iterate through each statement in the `statements` array
	for (let i = 0; i < statements.length; i++) {
		const statement = statements[i];
		const transformedStatements =
			ts.isVariableStatement(statement) &&
			(isUsingDeclaration(statement.declarationList) || isAwaitUsingDeclaration(statement.declarationList))
				? transformVariableDeclarationList(state, statement.declarationList, usingDeclarations)
				: transformStatement(state, statement);

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

		luau.list.pushList(result, transformedStatements);

		const lastStatement = transformedStatements.tail?.value;
		if (lastStatement && luau.isFinalStatement(lastStatement)) {
			// Function declarations are hoisted even when they appear after an unconditional return.
			const hoistedFunctions = luau.list.make<luau.Statement>();
			for (let j = i + 1; j < statements.length; j++) {
				const futureStatement = statements[j];
				if (ts.isFunctionDeclaration(futureStatement)) {
					luau.list.pushList(hoistedFunctions, transformStatement(state, futureStatement));
				}
			}

			if (luau.list.isNonEmpty(hoistedFunctions)) {
				let insertPoint = result.head;
				let lastHoistDeclaration: luau.ListNode<luau.Statement> | undefined;
				while (
					insertPoint &&
					luau.isVariableDeclaration(insertPoint.value) &&
					insertPoint.value.right === undefined
				) {
					lastHoistDeclaration = insertPoint;
					insertPoint = insertPoint.next;
				}

				if (lastHoistDeclaration) {
					const nextNode = lastHoistDeclaration.next;
					lastHoistDeclaration.next = hoistedFunctions.head;
					hoistedFunctions.head!.prev = lastHoistDeclaration;
					hoistedFunctions.tail!.next = nextNode;
					if (nextNode) {
						nextNode.prev = hoistedFunctions.tail;
					} else {
						result.tail = hoistedFunctions.tail;
					}
				} else {
					hoistedFunctions.tail!.next = result.head;
					if (result.head) {
						result.head.prev = hoistedFunctions.tail;
					}
					result.head = hoistedFunctions.head;
					if (!result.tail) {
						result.tail = hoistedFunctions.tail;
					}
				}
			}
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
		const finalizers = createDisposeStatements(state, usingDeclarations, parent);
		if (result.head && luau.list.isNonEmpty(finalizers)) {
			addFinalizers(result, result.head, finalizers);
		}
		if (!result.tail || !luau.isFinalStatement(result.tail.value)) {
			luau.list.pushList(result, finalizers);
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
