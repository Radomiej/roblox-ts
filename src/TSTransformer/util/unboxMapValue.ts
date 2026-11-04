import luau from "@roblox-ts/luau-ast";
import { TransformState } from "TSTransformer";
import ts from "typescript";

/** The input is already captured by the collection iterator. */
export function unboxMapValue(state: TransformState, node: ts.Node, value: luau.AnyIdentifier) {
	return luau.create(luau.SyntaxKind.IfExpression, {
		condition: luau.binary(value, "==", state.TS(node, "__undefined")),
		expression: luau.nil(),
		alternative: value,
	});
}
