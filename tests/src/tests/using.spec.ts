/// <reference path="../using.d.ts" />

export = () => {
	it("should call Symbol.dispose at end of scope", () => {
		let disposed = false;

		function createResource(): Disposable {
			return {
				[Symbol.dispose]() {
					disposed = true;
				},
			};
		}

		{
			using resource = createResource();
			expect(disposed).to.equal(false);
		}
		// After block ends, dispose should be called
		expect(disposed).to.equal(true);
	});

	it("should dispose resources in reverse order (LIFO)", () => {
		const disposeOrder: number[] = [];

		function createResource(id: number): Disposable {
			return {
				[Symbol.dispose]() {
					disposeOrder.push(id);
				},
			};
		}

		{
			using r1 = createResource(1);
			using r2 = createResource(2);
			using r3 = createResource(3);
		}

		// Resources should be disposed in reverse order (LIFO)
		expect(disposeOrder[0]).to.equal(3);
		expect(disposeOrder[1]).to.equal(2);
		expect(disposeOrder[2]).to.equal(1);
	});

	it("should handle null/undefined resources gracefully", () => {
		let otherDisposed = false;

		function createResource(): Disposable {
			return {
				[Symbol.dispose]() {
					otherDisposed = true;
				},
			};
		}

		{
			using resource1 = undefined as unknown as Disposable;
			using resource2 = createResource();
			// Should not throw for undefined
		}

		// Other resource should still be disposed
		expect(otherDisposed).to.equal(true);
	});
};
