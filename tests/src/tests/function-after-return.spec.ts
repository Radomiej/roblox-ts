// #2847: Functions declared after return should be hoisted
export = () => {
	it("should hoist function declarations after return", () => {
		function MainFunction() {
			let variable = 0;
			SetVariable(2);
			return variable;

			function SetVariable(value: number) {
				variable = value;
			}
		}
		expect(MainFunction()).to.equal(2);
	});

	it("should hoist nested function declarations", () => {
		function outer() {
			return inner();

			function inner() {
				return "hoisted";
			}
		}
		expect(outer()).to.equal("hoisted");
	});

	it("should hoist multiple functions after return", () => {
		function test() {
			const result = add(5, multiply(2, 3));
			return result;

			function add(a: number, b: number) {
				return a + b;
			}

			function multiply(a: number, b: number) {
				return a * b;
			}
		}
		expect(test()).to.equal(11);
	});

	it("should hoist function used in return expression", () => {
		function test() {
			return calculate(10);

			function calculate(x: number) {
				return x * 2;
			}
		}
		expect(test()).to.equal(20);
	});
};
