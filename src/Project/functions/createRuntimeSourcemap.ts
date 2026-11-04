import ts from "typescript";

export interface RuntimeSourcemapEntry {
	source: string;
	lines: Record<string, number>;
}

/** Retains alchemy's approximate landmark-based mapping; this is not an exact AST source map. */
export function createRuntimeSourcemap(
	sourceFile: ts.SourceFile,
	source: string,
	sourceRelativePath: string,
): RuntimeSourcemapEntry {
	const lines: Record<string, number> = {};
	const luaLines = source.split("\n");
	const tsLineCount = sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1;
	const luaLineCount = luaLines.length;

	// Calculate ratio for approximate mapping
	const ratio = tsLineCount / luaLineCount;

	// Find key landmarks in Lua source for better accuracy
	const functionMatches: Array<{ luaLine: number; name: string; type: string }> = [];
	for (let i = 0; i < luaLines.length; i++) {
		const line = luaLines[i];
		// Match function declarations: "function name(" or "local function name("
		const funcMatch = line.match(/(?:local\s+)?function\s+(\w+(?::\w+)?)\s*\(/);
		if (funcMatch) {
			functionMatches.push({ luaLine: i + 1, name: funcMatch[1], type: "function" });
		}
		// Match comments that might indicate TS line numbers
		const commentMatch = line.match(/--\s*(.+)\.ts:(\d+)/);
		if (commentMatch) {
			functionMatches.push({ luaLine: i + 1, name: `__comment_${i}`, type: "comment" });
		}
		// Match variable declarations as additional landmarks
		const varMatch = line.match(/local\s+(\w+)\s*=/);
		if (varMatch && !line.includes("function")) {
			functionMatches.push({ luaLine: i + 1, name: varMatch[1], type: "variable" });
		}
	}

	// Try to match Lua functions to TS functions for accurate mapping
	const tsFunctions: Array<{ line: number; name: string; type: string }> = [];
	ts.forEachChild(sourceFile, function visit(node) {
		if (ts.isFunctionDeclaration(node) && node.name) {
			const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
			tsFunctions.push({ line: pos.line + 1, name: node.name.text, type: "function" });
		} else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
			const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
			tsFunctions.push({ line: pos.line + 1, name: node.name.text, type: "method" });
		} else if (ts.isClassDeclaration(node) && node.name) {
			const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
			tsFunctions.push({ line: pos.line + 1, name: node.name.text, type: "class" });
		} else if (ts.isVariableStatement(node)) {
			// Track variable declarations
			node.declarationList.declarations.forEach(decl => {
				if (ts.isIdentifier(decl.name)) {
					const pos = sourceFile.getLineAndCharacterOfPosition(decl.name.getStart(sourceFile));
					tsFunctions.push({ line: pos.line + 1, name: decl.name.text, type: "variable" });
				}
			});
		} else if (ts.isExpressionStatement(node)) {
			// Track expression statements (like obj.method() calls)
			const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
			tsFunctions.push({ line: pos.line + 1, name: `__expr_${pos.line}`, type: "expression" });
		}
		ts.forEachChild(node, visit);
	});

	// Build mapping with landmarks for better accuracy
	const landmarks: Array<{ luaLine: number; tsLine: number }> = [];

	// Match landmarks by name and type with priority
	for (const luaFunc of functionMatches) {
		// Prioritize exact matches with same type
		let tsFunc = tsFunctions.find(
			f =>
				f.type === luaFunc.type &&
				(luaFunc.name === f.name ||
					luaFunc.name.endsWith(":" + f.name) ||
					luaFunc.name === f.name.replace(/^_+/, "")),
		);

		// Fallback to any type match
		if (!tsFunc) {
			tsFunc = tsFunctions.find(
				f =>
					luaFunc.name === f.name ||
					luaFunc.name.endsWith(":" + f.name) ||
					luaFunc.name === f.name.replace(/^_+/, ""),
			);
		}

		if (tsFunc) {
			landmarks.push({ luaLine: luaFunc.luaLine, tsLine: tsFunc.line });
		}
	}

	// Add landmarks for print/error statements (common patterns)
	for (let i = 0; i < luaLines.length; i++) {
		const line = luaLines[i];
		if (line.includes('print("---') || line.includes("error(")) {
			// Find corresponding TS line with similar pattern
			const tsSourceLines = sourceFile.text.split("\n");
			for (let j = 0; j < tsSourceLines.length; j++) {
				if (
					(line.includes('print("---') && tsSourceLines[j].includes('print("---')) ||
					(line.includes("error(") && tsSourceLines[j].includes("error("))
				) {
					landmarks.push({ luaLine: i + 1, tsLine: j + 1 });
					break;
				}
			}
		}
	}

	// Sort landmarks by Lua line
	landmarks.sort((a, b) => a.luaLine - b.luaLine);

	// Generate line mapping
	for (let luaLine = 1; luaLine <= luaLineCount; luaLine++) {
		let tsLine: number;

		if (landmarks.length === 0) {
			// No landmarks, use ratio-based mapping
			tsLine = Math.min(Math.max(1, Math.round(luaLine * ratio)), tsLineCount);
		} else {
			// Find surrounding landmarks and interpolate
			const before = landmarks.filter(l => l.luaLine <= luaLine).pop();
			const after = landmarks.find(l => l.luaLine > luaLine);

			if (before && after) {
				// Interpolate between landmarks
				const luaRange = after.luaLine - before.luaLine;
				const tsRange = after.tsLine - before.tsLine;
				const luaOffset = luaLine - before.luaLine;
				tsLine = Math.round(before.tsLine + (luaOffset / luaRange) * tsRange);
			} else if (before) {
				// After last landmark, use ratio from that point
				const luaOffset = luaLine - before.luaLine;
				tsLine = Math.min(before.tsLine + Math.round(luaOffset * ratio), tsLineCount);
			} else if (after) {
				// Before first landmark, use ratio to that point
				const luaRatio = luaLine / after.luaLine;
				tsLine = Math.max(1, Math.round(after.tsLine * luaRatio));
			} else {
				tsLine = Math.min(Math.max(1, Math.round(luaLine * ratio)), tsLineCount);
			}

			// Clamp to valid range
			tsLine = Math.min(Math.max(1, tsLine), tsLineCount);
		}

		lines[String(luaLine)] = tsLine;
	}
	return { source: sourceRelativePath, lines };
}
