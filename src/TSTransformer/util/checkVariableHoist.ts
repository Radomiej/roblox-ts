import { getOrSetDefault } from "Shared/util/getOrSetDefault";
import { TransformState } from "TSTransformer/classes/TransformState";
import { getAncestor, isAncestorOf } from "TSTransformer/util/traversal";
import ts from "typescript";

export function checkVariableHoist(state: TransformState, node: ts.Identifier, symbol: ts.Symbol) {
	if (state.isHoisted.get(symbol) !== undefined) {
		return;
	}

	const statement = getAncestor(node, ts.isStatement);
	if (!statement) {
		return;
	}

	// Check for case clause hoisting (original behavior)
	const caseClause = statement.parent;
	if (ts.isCaseClause(caseClause)) {
		const caseBlock = caseClause.parent;
		const isUsedOutsideOfCaseClause =
			ts.FindAllReferences.Core.eachSymbolReferenceInFile(
				node,
				state.typeChecker,
				node.getSourceFile(),
				token => {
					if (!isAncestorOf(caseClause, token)) {
						return true;
					}
				},
				caseBlock,
			) === true;

		if (isUsedOutsideOfCaseClause) {
			getOrSetDefault(state.hoistsByStatement, statement.parent, () => new Array<ts.Identifier>()).push(node);
			state.isHoisted.set(symbol, true);
		}
		return;
	}

	// #2847: Check for function declarations after return statements
	// Find the containing block and check if this function is used before it's declared
	const containingBlock = getAncestor(node, ts.isBlock);
	if (!containingBlock) {
		return;
	}

	// Check if this is a function declaration
	const functionDecl = getAncestor(node, ts.isFunctionDeclaration);
	if (!functionDecl || functionDecl.name !== node) {
		return;
	}

	// Find if there's a return statement before this function declaration
	let foundReturn = false;
	let foundFunction = false;
	for (const stmt of containingBlock.statements) {
		if (stmt === functionDecl) {
			foundFunction = true;
			break;
		}
		if (ts.isReturnStatement(stmt)) {
			foundReturn = true;
		}
	}

	// If function is declared after a return, it needs hoisting
	if (foundReturn && foundFunction) {
		getOrSetDefault(state.hoistsByStatement, functionDecl, () => new Array<ts.Identifier>()).push(node);
		state.isHoisted.set(symbol, true);
	}
}
