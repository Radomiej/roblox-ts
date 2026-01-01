import luau from "@roblox-ts/luau-ast";
import { errors } from "Shared/diagnostics";
import { assert } from "Shared/util/assert";
import { TransformState } from "TSTransformer";
import { DiagnosticService } from "TSTransformer/classes/DiagnosticService";
import { Prereqs } from "TSTransformer/classes/Prereqs";
import { transformArrayBindingPattern } from "TSTransformer/nodes/binding/transformArrayBindingPattern";
import { transformObjectBindingPattern } from "TSTransformer/nodes/binding/transformObjectBindingPattern";
import { transformExpression } from "TSTransformer/nodes/expressions/transformExpression";
import { transformIdentifierDefined } from "TSTransformer/nodes/expressions/transformIdentifier";
import { transformInitializer } from "TSTransformer/nodes/transformInitializer";
import { arrayBindingPatternContainsHoists } from "TSTransformer/util/arrayBindingPatternContainsHoists";
import { arrayLikeExpressionContainsSpread } from "TSTransformer/util/arrayLikeExpressionContainsSpread";
import { getTargetIdForBindingPattern } from "TSTransformer/util/binding/getTargetIdForBindingPattern";
import { checkVariableHoist } from "TSTransformer/util/checkVariableHoist";
import { isSymbolMutable } from "TSTransformer/util/isSymbolMutable";
import { isLuaTupleType } from "TSTransformer/util/types";
import { validateIdentifier } from "TSTransformer/util/validateIdentifier";
import { wrapExpressionStatement } from "TSTransformer/util/wrapExpressionStatement";
import ts from "typescript";

export function transformVariable(
	state: TransformState,
	prereqs: Prereqs,
	identifier: ts.Identifier,
	right?: luau.Expression,
) {
	validateIdentifier(state, identifier);

	const symbol = state.typeChecker.getSymbolAtLocation(identifier);
	assert(symbol);

	// export let
	if (isSymbolMutable(state, symbol)) {
		const exportAccess = state.getModuleIdPropertyAccess(symbol);
		if (exportAccess) {
			if (right) {
				prereqs.prereq(
					luau.create(luau.SyntaxKind.Assignment, {
						left: exportAccess,
						operator: "=",
						right,
					}),
				);
			}
			return exportAccess;
		}
	}

	const left: luau.AnyIdentifier = transformIdentifierDefined(state, prereqs, identifier);

	checkVariableHoist(state, identifier, symbol);
	if (state.isHoisted.get(symbol) === true) {
		// no need to do `x = nil` if the variable is already created
		if (right) {
			prereqs.prereq(luau.create(luau.SyntaxKind.Assignment, { left, operator: "=", right }));
		}
	} else {
		prereqs.prereq(luau.create(luau.SyntaxKind.VariableDeclaration, { left, right }));
	}

	return left;
}

function transformOptimizedArrayBindingPattern(
	state: TransformState,
	bindingPattern: ts.ArrayBindingPattern,
	rhs: luau.Expression | luau.List<luau.Expression>,
) {
	return state.capturePrereqs(() => {
		const ids = luau.list.make<luau.AnyIdentifier>();
		const statements = state.capturePrereqs(() => {
			for (const element of bindingPattern.elements) {
				if (ts.isOmittedExpression(element)) {
					luau.list.push(ids, luau.tempId());
				} else {
					if (ts.isIdentifier(element.name)) {
						validateIdentifier(state, element.name);
						const id = transformIdentifierDefined(state, new Prereqs(), element.name);
						luau.list.push(ids, id);
						if (element.initializer) {
							const prereqs = new Prereqs();
							const initStatement = transformInitializer(state, prereqs, id, element.initializer);
							state.prereq(initStatement);
						}
					} else {
						const id = luau.tempId("binding");
						luau.list.push(ids, id);
						if (element.initializer) {
							const prereqs = new Prereqs();
							const initStatement = transformInitializer(state, prereqs, id, element.initializer);
							state.prereq(initStatement);
						}
						if (ts.isArrayBindingPattern(element.name)) {
							const bindingPrereqs = new Prereqs();
							transformArrayBindingPattern(state, bindingPrereqs, element.name, id);
							state.prereqList(bindingPrereqs.statements);
						} else {
							const bindingPrereqs = new Prereqs();
							transformObjectBindingPattern(state, bindingPrereqs, element.name, id);
							state.prereqList(bindingPrereqs.statements);
						}
					}
				}
			}
		});
		assert(!luau.list.isEmpty(ids));
		state.prereq(luau.create(luau.SyntaxKind.VariableDeclaration, { left: ids, right: rhs }));
		state.prereqList(statements);
	});
}

export function transformVariableDeclaration(
	state: TransformState,
	node: ts.VariableDeclaration,
): luau.List<luau.Statement> {
	const statements = luau.list.make<luau.Statement>();
	let value: luau.Expression | undefined;
	if (node.initializer) {
		// must transform right _before_ checking isHoisted, that way references inside of value can be hoisted
		const prereqs = new Prereqs();
		value = transformExpression(state, prereqs, node.initializer!);
		luau.list.pushList(statements, prereqs.statements);
	}

	const name = node.name;
	if (ts.isIdentifier(name)) {
		const prereqs = new Prereqs();
		transformVariable(state, prereqs, name, value);
		luau.list.pushList(statements, prereqs.statements);
	} else {
		// in destructuring, rhs must be executed first
		assert(node.initializer && value);

		// optimize empty destructure
		if (name.elements.length === 0) {
			if (!luau.isArray(value) || !luau.list.isEmpty(value.members)) {
				luau.list.pushList(statements, wrapExpressionStatement(value));
			}
			return statements;
		}

		if (ts.isArrayBindingPattern(name)) {
			if (
				luau.isCall(value) &&
				isLuaTupleType(state)(state.getType(node.initializer)) &&
				!arrayBindingPatternContainsHoists(state, name) &&
				!arrayLikeExpressionContainsSpread(name)
			) {
				luau.list.pushList(statements, transformOptimizedArrayBindingPattern(state, name, value));
			} else if (
				luau.isArray(value) &&
				!luau.list.isEmpty(value.members) &&
				// we can't localize multiple variables at the same time if any of them are hoisted
				!arrayBindingPatternContainsHoists(state, name) &&
				!arrayLikeExpressionContainsSpread(name)
			) {
				luau.list.pushList(statements, transformOptimizedArrayBindingPattern(state, name, value.members));
			} else {
				const prereqs = new Prereqs();
				transformArrayBindingPattern(state, prereqs, name, getTargetIdForBindingPattern(state, name, value!));
				luau.list.pushList(statements, prereqs.statements);
			}
		} else {
			const prereqs = new Prereqs();
			transformObjectBindingPattern(state, prereqs, name, getTargetIdForBindingPattern(state, name, value!));
			luau.list.pushList(statements, prereqs.statements);
		}
	}

	return statements;
}

export function isVarDeclaration(node: ts.VariableDeclarationList) {
	// var = no flags (0), or flags that don't include const/let/using/awaitUsing
	// Using = 4, AwaitUsing = 6, Const = 2, Let = 1
	const flags = node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing);
	return flags === 0;
}

export function isUsingDeclaration(node: ts.VariableDeclarationList) {
	// Using = 4 exactly (not AwaitUsing which is 6)
	const flags = node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing);
	return flags === ts.NodeFlags.Using;
}

export function isAwaitUsingDeclaration(node: ts.VariableDeclarationList) {
	// AwaitUsing = 6 (Using + Const bits, but semantically different)
	const flags = node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing);
	return flags === ts.NodeFlags.AwaitUsing;
}

export interface UsingDeclarationInfo {
	id: luau.AnyIdentifier;
	isAwait: boolean;
}

function transformUsingDeclaration(
	state: TransformState,
	node: ts.VariableDeclarationList,
	usingDeclarations: Array<UsingDeclarationInfo>,
): luau.List<luau.Statement> {
	const statements = luau.list.make<luau.Statement>();
	const isAwaitUsing = isAwaitUsingDeclaration(node);

	// await using is not yet supported (requires async dispose)
	if (isAwaitUsing) {
		DiagnosticService.addDiagnostic(errors.noUsingStatement(node));
		// Still transform as regular declaration for now
		for (const declaration of node.declarations) {
			const [variableStatements, prereqs] = state.capture(() => transformVariableDeclaration(state, declaration));
			luau.list.pushList(statements, prereqs);
			luau.list.pushList(statements, variableStatements);
		}
		return statements;
	}

	// Transform using declarations and track them for disposal
	for (const declaration of node.declarations) {
		if (!declaration.initializer) continue;

		const initPrereqs = new Prereqs();
		const initExp = transformExpression(state, initPrereqs, declaration.initializer!);
		luau.list.pushList(statements, initPrereqs.statements);

		const name = declaration.name;
		if (!ts.isIdentifier(name)) {
			// Destructuring in using is not supported
			DiagnosticService.addDiagnostic(errors.noUsingStatement(node));
			continue;
		}

		const resourceId = transformIdentifierDefined(state, new Prereqs(), name);

		// Create: local resource = initExp
		luau.list.push(
			statements,
			luau.create(luau.SyntaxKind.VariableDeclaration, {
				left: resourceId,
				right: initExp,
			}),
		);

		// Track this using declaration for later disposal
		usingDeclarations.push({ id: resourceId, isAwait: isAwaitUsing });
	}

	return statements;
}

export function transformVariableDeclarationList(
	state: TransformState,
	node: ts.VariableDeclarationList,
	usingDeclarations?: Array<UsingDeclarationInfo>,
): luau.List<luau.Statement> {
	if (isVarDeclaration(node)) {
		DiagnosticService.addDiagnostic(errors.noVar(node));
	}

	// using/await using declarations need special handling
	if (isUsingDeclaration(node) || isAwaitUsingDeclaration(node)) {
		if (usingDeclarations) {
			return transformUsingDeclaration(state, node, usingDeclarations);
		} else {
			// No using declarations tracking - show diagnostic
			DiagnosticService.addDiagnostic(errors.noUsingStatement(node));
			// Transform as regular const
			const statements = luau.list.make<luau.Statement>();
			for (const declaration of node.declarations) {
				const prereqs = new Prereqs();
				const variableStatements = transformVariableDeclaration(state, declaration);
				luau.list.pushList(statements, prereqs.statements);
				luau.list.pushList(statements, variableStatements);
			}
			return statements;
		}
	}

	const statements = luau.list.make<luau.Statement>();
	for (const declaration of node.declarations) {
		const prereqs = new Prereqs();
		const variableStatements = transformVariableDeclaration(state, declaration);
		luau.list.pushList(statements, prereqs.statements);
		luau.list.pushList(statements, variableStatements);
	}

	return statements;
}

export function transformVariableStatement(
	state: TransformState,
	node: ts.VariableStatement,
): luau.List<luau.Statement> {
	return transformVariableDeclarationList(state, node.declarationList);
}
