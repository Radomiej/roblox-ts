import luau from "@roblox-ts/luau-ast";
import { TransformState } from "TSTransformer";
import { Prereqs } from "TSTransformer/classes/Prereqs";
import ts from "typescript";

export function transformNumericLiteral(state: TransformState, prereqs: Prereqs, node: ts.NumericLiteral) {
	return luau.create(luau.SyntaxKind.NumberLiteral, {
		value: node.getText(),
	});
}
