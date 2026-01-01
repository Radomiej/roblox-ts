import luau from "@roblox-ts/luau-ast";
import { errors } from "Shared/diagnostics";
import { TransformState } from "TSTransformer";
import { DiagnosticService } from "TSTransformer/classes/DiagnosticService";
import { Prereqs } from "TSTransformer/classes/Prereqs";
import { transformExpression } from "TSTransformer/nodes/expressions/transformExpression";
import { transformPropertyName } from "TSTransformer/nodes/transformPropertyName";
import ts from "typescript";

export function transformPropertyDeclaration(
	state: TransformState,
	node: ts.PropertyDeclaration,
	name: luau.AnyIdentifier,
) {
	if (!ts.hasStaticModifier(node)) {
		return luau.list.make<luau.Statement>();
	}

	if (ts.isPrivateIdentifier(node.name)) {
		DiagnosticService.addDiagnostic(errors.noPrivateIdentifier(node));
		return luau.list.make<luau.Statement>();
	}

	if (!node.initializer) {
		return luau.list.make<luau.Statement>();
	}

	const statements = luau.list.make<luau.Statement>();

	const indexPrereqs = new Prereqs();
	const index = transformPropertyName(state, indexPrereqs, node.name);
	luau.list.pushList(statements, indexPrereqs.statements);

	const valuePrereqs = new Prereqs();
	const value = transformExpression(state, valuePrereqs, node.initializer);
	luau.list.pushList(statements, valuePrereqs.statements);

	luau.list.push(
		statements,
		luau.create(luau.SyntaxKind.Assignment, {
			left: luau.create(luau.SyntaxKind.ComputedIndexExpression, {
				expression: name,
				index,
			}),
			operator: "=",
			right: value,
		}),
	);

	return statements;
}
