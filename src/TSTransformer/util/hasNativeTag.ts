import ts from "typescript";

export function hasNativeTag(node: ts.Node) {
	if (ts.getJSDocTags(node).some(tag => tag.tagName.text === "native")) {
		return true;
	}

	// TypeScript does not attach same-line JSDoc comments to class members.
	const leadingTrivia = node.getFullText().slice(0, node.getStart() - node.getFullStart());
	return /\/\*\*[\s\S]*?@native(?:\s|\*)[\s\S]*?\*\//.test(leadingTrivia);
}
