import luau from "@roblox-ts/luau-ast";
import { Prereqs } from "TSTransformer/classes/Prereqs";
import { TransformState } from "TSTransformer/classes/TransformState";
import { transformExpression } from "TSTransformer/nodes/expressions/transformExpression";
import { isUsedAsStatement } from "TSTransformer/util/isUsedAsStatement";
import ts from "typescript";

export function transformYieldExpression(state: TransformState, prereqs: Prereqs, node: ts.YieldExpression) {
	if (!node.expression) {
		return luau.call(state.TS(node, "yield"), []);
	}

	const expression = transformExpression(state, prereqs, node.expression);
	if (node.asteriskToken) {
		// delegation keeps the original next function even if the iterator is later modified
		const iteratorId = prereqs.pushToVar(expression, "iterator");
		const nextId = prereqs.pushToVar(luau.property(iteratorId, "next"), "next");
		const currentInputId = prereqs.pushToVar(undefined, "currentInput");
		const resultId = luau.tempId("result");

		const finalizer = luau.list.make<luau.Statement>(luau.create(luau.SyntaxKind.BreakStatement, {}));
		let evaluated: luau.Expression = luau.none();

		if (!isUsedAsStatement(node)) {
			const returnValue = prereqs.pushToVar(undefined, "returnValue");
			luau.list.unshift(
				finalizer,
				luau.create(luau.SyntaxKind.Assignment, {
					left: returnValue,
					operator: "=",
					right: luau.property(resultId, "value"),
				}),
			);
			evaluated = returnValue;
		}

		const yieldCall = luau.call(luau.globals.coroutine.yield, [luau.property(resultId, "value")]);
		const returnMethod = luau.tempId("returnMethod");

		prereqs.push(
			luau.create(luau.SyntaxKind.WhileStatement, {
				condition: luau.bool(true),
				statements: luau.list.make<luau.Statement>(
					luau.create(luau.SyntaxKind.VariableDeclaration, {
						left: resultId,
						right: luau.call(nextId, [currentInputId]),
					}),
					luau.create(luau.SyntaxKind.IfStatement, {
						condition: luau.property(resultId, "done"),
						statements: finalizer,
						elseBody: luau.list.make(),
					}),
					luau.create(luau.SyntaxKind.Assignment, {
						left: currentInputId,
						operator: "=",
						right: yieldCall,
					}),
					luau.create(luau.SyntaxKind.IfStatement, {
						condition: luau.binary(currentInputId, "==", state.TS(node, "GENERATOR_RETURN")),
						statements: luau.list.make<luau.Statement>(
							luau.create(luau.SyntaxKind.VariableDeclaration, {
								left: returnMethod,
								right: luau.create(luau.SyntaxKind.ComputedIndexExpression, {
									expression: iteratorId,
									index: luau.string("return"),
								}),
							}),
							luau.create(luau.SyntaxKind.IfStatement, {
								condition: returnMethod,
								statements: luau.list.make(
									luau.create(luau.SyntaxKind.CallStatement, {
										expression: luau.call(returnMethod, [iteratorId]),
									}),
								),
								elseBody: luau.list.make(),
							}),
							luau.create(luau.SyntaxKind.CallStatement, {
								expression: luau.call(luau.globals.error, [state.TS(node, "GENERATOR_RETURN")]),
							}),
						),
						elseBody: luau.list.make(),
					}),
				),
			}),
		);

		return evaluated;
	} else {
		return luau.call(state.TS(node, "yield"), [expression]);
	}
}
