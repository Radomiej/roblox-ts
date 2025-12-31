import luau from "@roblox-ts/luau-ast";
import { errors } from "Shared/diagnostics";
import { TransformState } from "TSTransformer";
import { DiagnosticService } from "TSTransformer/classes/DiagnosticService";
import { Prereqs } from "TSTransformer/classes/Prereqs";
import { transformObjectBindingPattern } from "TSTransformer/nodes/binding/transformObjectBindingPattern";
import { transformVariable } from "TSTransformer/nodes/statements/transformVariableStatement";
import { transformInitializer } from "TSTransformer/nodes/transformInitializer";
import { getAccessorForBindingType } from "TSTransformer/util/binding/getAccessorForBindingType";
import { convertToIndexableExpression } from "TSTransformer/util/convertToIndexableExpression";
import { getSpreadDestructorForType } from "TSTransformer/util/spreadDestructuring";
import { isDefinitelyType, isIterableType } from "TSTransformer/util/types";
import { validateNotAnyType } from "TSTransformer/util/validateNotAny";
import ts from "typescript";

export function transformArrayBindingPattern(
	state: TransformState,
	prereqs: Prereqs,
	bindingPattern: ts.ArrayBindingPattern,
	parentId: luau.AnyIdentifier,
) {
	validateNotAnyType(state, bindingPattern);

	let index = 0;
	const idStack = new Array<luau.AnyIdentifier>();
	const patternType = state.getType(bindingPattern);

	if (isDefinitelyType(patternType, isIterableType(state))) {
		DiagnosticService.addDiagnostic(errors.noIterableDestructuring(bindingPattern));
		parentId = prereqs.pushToVar(
			luau.call(
				luau.create(luau.SyntaxKind.ComputedIndexExpression, {
					expression: convertToIndexableExpression(parentId),
					index: luau.property(state.TS(bindingPattern, "Symbol"), "iterator"),
				}),
				[parentId],
			),
			"iterator",
		);
	}

	const accessor = getAccessorForBindingType(state, bindingPattern, patternType);
	const destructor = getSpreadDestructorForType(state, bindingPattern, patternType);

	for (const element of bindingPattern.elements) {
		if (ts.isOmittedExpression(element)) {
			accessor(state, prereqs, parentId, index, idStack, true);
		} else {
			const name = element.name;

			const isSpreadElement = element.dotDotDotToken !== undefined;
			const value = isSpreadElement
				? destructor(state, prereqs, parentId, index, idStack)
				: accessor(state, prereqs, parentId, index, idStack, false);

			if (ts.isIdentifier(name)) {
				const id = transformVariable(state, prereqs, name, value);
				if (element.initializer) {
					prereqs.prereq(transformInitializer(state, prereqs, id, element.initializer));
				}
			} else {
				const id = prereqs.pushToVar(value, "binding");
				if (element.initializer) {
					prereqs.prereq(transformInitializer(state, prereqs, id, element.initializer));
				}
				if (ts.isArrayBindingPattern(name)) {
					transformArrayBindingPattern(state, prereqs, name, id);
				} else {
					transformObjectBindingPattern(state, prereqs, name, id);
				}
			}
		}
		index++;
	}
}
