import luau from "@roblox-ts/luau-ast";
import { TransformState } from "TSTransformer";
import { Prereqs } from "TSTransformer/classes/Prereqs";
import { transformExpression } from "TSTransformer/nodes/expressions/transformExpression";
import { createTruthinessChecks } from "TSTransformer/util/createTruthinessChecks";
import { isUsedAsStatement } from "TSTransformer/util/isUsedAsStatement";
import { wrapExpressionStatement } from "TSTransformer/util/wrapExpressionStatement";
import ts from "typescript";

export function transformConditionalExpression(
	state: TransformState,
	prereqs: Prereqs,
	node: ts.ConditionalExpression,
) {
	const condition = transformExpression(state, prereqs, node.condition);
	const whenTrue = transformExpression(state, prereqs, node.whenTrue);
	const whenFalse = transformExpression(state, prereqs, node.whenFalse);

	if (isUsedAsStatement(node)) {
		const whenTrueStatements = wrapExpressionStatement(whenTrue);
		const whenFalseStatements = wrapExpressionStatement(whenFalse);
		prereqs.prereq(
			luau.create(luau.SyntaxKind.IfStatement, {
				condition: createTruthinessChecks(state, prereqs, condition, node.condition),
				statements: whenTrueStatements,
				elseBody: whenFalseStatements,
			}),
		);
		return luau.none();
	}

	if (luau.list.isEmpty(prereqs.statements)) {
		return luau.create(luau.SyntaxKind.IfExpression, {
			condition: createTruthinessChecks(state, prereqs, condition, node.condition),
			expression: whenTrue,
			alternative: whenFalse,
		});
	}

	const tempId = prereqs.pushToVar(undefined, "result");

	prereqs.prereq(
		luau.create(luau.SyntaxKind.IfStatement, {
			condition: createTruthinessChecks(state, prereqs, condition, node.condition),
			statements: luau.list.make(
				luau.create(luau.SyntaxKind.Assignment, {
					left: tempId,
					operator: "=",
					right: whenTrue,
				}),
			),
			elseBody: luau.list.make(
				luau.create(luau.SyntaxKind.Assignment, {
					left: tempId,
					operator: "=",
					right: whenFalse,
				}),
			),
		}),
	);

	return tempId;
}
