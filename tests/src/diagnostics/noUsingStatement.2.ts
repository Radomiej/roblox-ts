/// @diagnostic noUsingStatement
/// <reference path="../using.d.ts" />

async function getAsyncResource(): Promise<AsyncDisposable> {
	return {
		[Symbol.asyncDispose]() {
			return Promise.resolve();
		},
	};
}

async function test() {
	await using resource = await getAsyncResource();
}
