// Known limitation: Node prints "undefined", "a", "b"; Luau skips the nil entry.
for (const key of [undefined, "a", "b"]) {
	print(key === undefined ? "undefined" : key);
}
