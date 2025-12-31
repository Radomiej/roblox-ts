import luau from "@roblox-ts/luau-ast";
import { TransformState } from "TSTransformer";
import { Prereqs } from "TSTransformer/classes/Prereqs";
import { transformExpression } from "TSTransformer/nodes/expressions/transformExpression";
import ts from "typescript";

export function transformThrowStatement(state: TransformState, node: ts.ThrowStatement) {
	const result = luau.list.make<luau.Statement>();
	const args = new Array<luau.Expression>();
	if (node.expression !== undefined) {
		const prereqs = new Prereqs();
		args.push(transformExpression(state, prereqs, node.expression));
		luau.list.pushList(result, prereqs.statements);
	}
	luau.list.push(
		result,
		luau.create(luau.SyntaxKind.CallStatement, {
			expression: luau.call(luau.globals.error, args),
		}),
	);
	return result;
}
