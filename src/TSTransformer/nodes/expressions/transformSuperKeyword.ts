import luau from "@roblox-ts/luau-ast";
import { TransformState } from "TSTransformer";
import { Prereqs } from "TSTransformer/classes/Prereqs";

export function transformSuperKeyword(_state: TransformState, _prereqs: Prereqs) {
	return luau.globals.super;
}
