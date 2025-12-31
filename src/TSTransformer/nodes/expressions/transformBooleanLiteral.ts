import luau from "@roblox-ts/luau-ast";
import { TransformState } from "TSTransformer";
import { Prereqs } from "TSTransformer/classes/Prereqs";

export function transformTrueKeyword(state: TransformState, prereqs: Prereqs) {
	return luau.create(luau.SyntaxKind.TrueLiteral, {});
}

export function transformFalseKeyword(state: TransformState, prereqs: Prereqs) {
	return luau.create(luau.SyntaxKind.FalseLiteral, {});
}
