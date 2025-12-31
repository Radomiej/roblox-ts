import luau from "@roblox-ts/luau-ast";
import { TransformState } from "TSTransformer";
import { Prereqs } from "TSTransformer/classes/Prereqs";
import { transformExpression } from "TSTransformer/nodes/expressions/transformExpression";
import ts from "typescript";

export function transformInitializer(
	state: TransformState,
	prereqs: Prereqs,
	id: luau.WritableExpression,
	initializer: ts.Expression,
) {
	const exp = transformExpression(state, prereqs, initializer);
	prereqs.prereq(
		luau.create(luau.SyntaxKind.Assignment, {
			left: id,
			operator: "=",
			right: exp,
		}),
	);
	return luau.create(luau.SyntaxKind.IfStatement, {
		condition: luau.binary(id, "==", luau.nil()),
		elseBody: luau.list.make(),
		statements: prereqs.statements,
	});
}
