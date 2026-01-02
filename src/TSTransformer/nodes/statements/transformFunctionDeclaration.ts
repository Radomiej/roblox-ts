import luau from "@roblox-ts/luau-ast";
import { errors } from "Shared/diagnostics";
import { assert } from "Shared/util/assert";
import { DiagnosticService } from "TSTransformer/classes/DiagnosticService";
import { Prereqs } from "TSTransformer/classes/Prereqs";
import { TransformState } from "TSTransformer/classes/TransformState";
import { transformIdentifierDefined } from "TSTransformer/nodes/expressions/transformIdentifier";
import { transformParameters } from "TSTransformer/nodes/transformParameters";
import { transformStatementList } from "TSTransformer/nodes/transformStatementList";
import { checkVariableHoist } from "TSTransformer/util/checkVariableHoist";
import { validateIdentifier } from "TSTransformer/util/validateIdentifier";
import { wrapStatementsAsGenerator } from "TSTransformer/util/wrapStatementsAsGenerator";
import ts from "typescript";

/**
 * Check if a function has the @native JSDoc tag
 */
function hasNativeTag(node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction): boolean {
	const jsDocTags = ts.getJSDocTags(node);
	return jsDocTags.some(tag => tag.tagName.text === "native");
}

export function transformFunctionDeclaration(state: TransformState, node: ts.FunctionDeclaration) {
	if (!node.body) {
		return luau.list.make<luau.Statement>();
	}

	const isExportDefault = ts.hasSyntacticModifier(node, ts.ModifierFlags.ExportDefault);

	assert(node.name || isExportDefault);

	if (node.name) {
		validateIdentifier(state, node.name);
		// #2847: Check if this function needs hoisting (e.g., declared after return)
		const symbol = state.typeChecker.getSymbolAtLocation(node.name);
		if (symbol) {
			checkVariableHoist(state, node.name, symbol);
		}
	}

	const name = node.name ? transformIdentifierDefined(state, new Prereqs(), node.name) : luau.id("default");

	// Check for @native JSDoc tag
	const isNative = hasNativeTag(node);
	if (isNative) {
		// Luau comment directives like --!native must be at the top of the file.
		// transformSourceFile will emit it as a leading directive when needed.
		state.hasNativeDirective = true;
	}

	let { statements, parameters, hasDotDotDot } = transformParameters(state, node);
	luau.list.pushList(statements, transformStatementList(state, node.body, node.body.statements));

	let localize = isExportDefault;
	if (node.name) {
		const symbol = state.typeChecker.getSymbolAtLocation(node.name);
		assert(symbol);
		localize = state.isHoisted.get(symbol) !== true;
	}

	const isAsync = ts.hasSyntacticModifier(node, ts.ModifierFlags.Async);

	if (node.asteriskToken) {
		if (isAsync) {
			DiagnosticService.addDiagnostic(errors.noAsyncGeneratorFunctions(node));
		}
		statements = wrapStatementsAsGenerator(state, node, statements);
	}

	const result = luau.list.make<luau.Statement>();

	if (isAsync) {
		const right = luau.call(state.TS(node, "async"), [
			luau.create(luau.SyntaxKind.FunctionExpression, {
				hasDotDotDot,
				parameters,
				statements,
			}),
		]);
		if (localize) {
			luau.list.push(
				result,
				luau.create(luau.SyntaxKind.VariableDeclaration, {
					left: name,
					right,
				}),
			);
		} else {
			luau.list.push(
				result,
				luau.create(luau.SyntaxKind.Assignment, {
					left: name,
					operator: "=",
					right,
				}),
			);
		}
	} else {
		luau.list.push(
			result,
			luau.create(luau.SyntaxKind.FunctionDeclaration, { localize, name, statements, parameters, hasDotDotDot }),
		);
	}

	return result;
}
