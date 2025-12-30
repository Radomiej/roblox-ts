import luau from "@roblox-ts/luau-ast";
import { errors } from "Shared/diagnostics";
import { TransformState } from "TSTransformer";
import { DiagnosticService } from "TSTransformer/classes/DiagnosticService";
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
	bindingPattern: ts.ArrayBindingPattern,
	parentId: luau.AnyIdentifier,
) {
	validateNotAnyType(state, bindingPattern);

	let index = 0;
	const idStack = new Array<luau.AnyIdentifier>();
	const patternType = state.getType(bindingPattern);

	if (isDefinitelyType(patternType, isIterableType(state))) {
		DiagnosticService.addDiagnostic(errors.noIterableDestructuring(bindingPattern));
		parentId = state.pushToVar(
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
			accessor(state, parentId, index, idStack, true);
		} else {
			const name = element.name;

			const isSpreadElement = element.dotDotDotToken !== undefined;
			const value = isSpreadElement
				? destructor(state, parentId, index, idStack)
				: accessor(state, parentId, index, idStack, false);

			if (ts.isIdentifier(name)) {
				const id = transformVariable(state, name, value);
				if (element.initializer) {
					state.prereq(transformInitializer(state, id, element.initializer));
				}
			} else {
				const id = state.pushToVar(value, "binding");
				if (element.initializer) {
					state.prereq(transformInitializer(state, id, element.initializer));
				}
				if (ts.isArrayBindingPattern(name)) {
					transformArrayBindingPattern(state, name, id);
				} else {
					transformObjectBindingPattern(state, name, id);
				}
			}
		}
		index++;
	}
}
