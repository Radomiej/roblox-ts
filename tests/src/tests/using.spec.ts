interface SymbolConstructor {
	readonly dispose: symbol;
}
declare const Symbol: SymbolConstructor;

interface Disposable {
	[Symbol.dispose](): void;
}

class Resource implements Disposable {
	constructor(public name: string) {}
	[Symbol.dispose]() {
		print(`Disposed: ${this.name}`);
	}
}

export = () => {
	it("should support using declarations", () => {
		const disposed: string[] = [];

		class TestResource implements Disposable {
			constructor(public id: number) {}
			[Symbol.dispose]() {
				disposed.push(`resource${this.id}`);
			}
		}

		{
			using resource1 = new TestResource(1);
			using resource2 = new TestResource(2);
		}

		// Resources should be disposed in reverse order (LIFO)
		expect(disposed[0]).to.equal("resource2");
		expect(disposed[1]).to.equal("resource1");
	});

	it("should support using with null/undefined", () => {
		let disposed = false;

		class TestResource implements Disposable {
			[Symbol.dispose]() {
				disposed = true;
			}
		}

		{
			using resource: TestResource | undefined = undefined;
		}

		// Should not throw, null/undefined are ignored
		expect(disposed).to.equal(false);
	});

	it("should dispose even when exception occurs", () => {
		const disposed: string[] = [];

		class TestResource implements Disposable {
			constructor(public id: number) {}
			[Symbol.dispose]() {
				disposed.push(`resource${this.id}`);
			}
		}

		let errorThrown = false;
		try {
			using resource1 = new TestResource(1);
			using resource2 = new TestResource(2);
			throw "test error";
		} catch {
			errorThrown = true;
		}

		expect(errorThrown).to.equal(true);
		expect(disposed[0]).to.equal("resource2");
		expect(disposed[1]).to.equal("resource1");
	});
};
