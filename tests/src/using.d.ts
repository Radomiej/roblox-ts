/// <reference no-default-lib="true"/>

// Global types required for `using` and `await using` statements (TypeScript 5.2+)
// These are normally in lib.esnext.disposable.d.ts but we need them for roblox-ts tests

interface SymbolConstructor {
	readonly dispose: unique symbol;
	readonly asyncDispose: unique symbol;
}

interface Disposable {
	[Symbol.dispose](): void;
}

interface AsyncDisposable {
	[Symbol.asyncDispose](): PromiseLike<void>;
}
