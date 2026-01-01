import luau from "@roblox-ts/luau-ast";
import { TransformState } from "TSTransformer";
import { Prereqs } from "TSTransformer/classes/Prereqs";
import { transformArrayBindingPattern } from "TSTransformer/nodes/binding/transformArrayBindingPattern";
import { transformObjectBindingPattern } from "TSTransformer/nodes/binding/transformObjectBindingPattern";
import { transformIdentifierDefined } from "TSTransformer/nodes/expressions/transformIdentifier";
import ts from "typescript";

export function transformBindingName(
	state: TransformState,
	name: ts.BindingName,
	initializers: luau.List<luau.Statement>,
) {
	let id: luau.AnyIdentifier;
	if (ts.isIdentifier(name)) {
		id = transformIdentifierDefined(state, new Prereqs(), name);
	} else {
		id = luau.tempId("binding");
		luau.list.pushList(
			initializers,
			state.capturePrereqs(() => {
				const prereqs = new Prereqs();
				if (ts.isArrayBindingPattern(name)) {
					transformArrayBindingPattern(state, prereqs, name, id);
				} else {
					transformObjectBindingPattern(state, prereqs, name, id);
				}
				state.prereqList(prereqs.statements);
			}),
		);
	}
	return id;
}
