interface ServerScriptService extends Instance {
	tests: Folder;
}

interface SharedTable {
	[Symbol.iterator](): IterableIterator<[string | number, unknown]>;
}
