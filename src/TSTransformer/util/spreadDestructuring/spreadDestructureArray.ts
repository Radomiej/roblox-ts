import luau from "@roblox-ts/luau-ast";
import { Prereqs } from "TSTransformer/classes/Prereqs";
import { TransformState } from "TSTransformer/classes/TransformState";

export function spreadDestructureArray(
	state: TransformState,
	prereqs: Prereqs,
	parentId: luau.AnyIdentifier,
	index: number,
	idStack: Array<luau.AnyIdentifier>,
) {
	return luau.call(luau.globals.table.move, [
		parentId,
		luau.number(index + 1),
		luau.unary("#", parentId),
		luau.number(1),
		luau.array(),
	]);
}
