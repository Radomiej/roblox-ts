import luau from "@roblox-ts/luau-ast";
import { TransformState } from "TSTransformer";
import { skipUpwards } from "TSTransformer/util/traversal";
import { isLuaTupleType } from "TSTransformer/util/types";
import ts from "typescript";

export function wrapLuaTupleForIndexedCall(
	state: TransformState,
	node: ts.CallExpression,
	expression: luau.Expression,
) {
	if (!luau.isCall(expression) || !isLuaTupleType(state)(state.getType(node))) {
		return expression;
	}

	const value = skipUpwards(node);
	const access = value.parent;
	if (!access || !ts.isElementAccessExpression(access) || access.questionDotToken) {
		return expression;
	}

	const indexedValue = skipUpwards(access);
	const call = indexedValue.parent;
	if (!call || !ts.isCallExpression(call) || call.expression !== indexedValue) {
		return expression;
	}

	return luau.array([expression]);
}
