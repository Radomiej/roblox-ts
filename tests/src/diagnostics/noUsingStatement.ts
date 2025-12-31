/// @diagnostic noUsingStatement
/// <reference path="../using.d.ts" />

function getResource(): Disposable {
	return {
		[Symbol.dispose]() {},
	};
}

using resource = getResource();
