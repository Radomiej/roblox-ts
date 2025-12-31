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
 */
function createDisposeStatements(state: TransformState, usingDeclarations: Array<UsingDeclarationInfo>, node: ts.Node) {
	const disposeStatements = luau.list.make<luau.Statement>();

	// Dispose in reverse order (LIFO) - last declared, first disposed
	for (let i = usingDeclarations.length - 1; i >= 0; i--) {
		const { id } = usingDeclarations[i];
		const symbolDispose = luau.property(state.TS(node, "Symbol"), "dispose");

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

	return disposeStatements;
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

	// Add dispose statements for using declarations at end of scope (LIFO order)
	if (usingDeclarations.length > 0 && parent) {
		luau.list.pushList(result, createDisposeStatements(state, usingDeclarations, parent));
	}

	if (state.compilerOptions.removeComments !== true) {
		const lastToken = getLastToken(parent, statements);
		if (lastToken) {
			luau.list.pushList(result, state.getLeadingComments(lastToken));
		}
	}

	return result;
}
