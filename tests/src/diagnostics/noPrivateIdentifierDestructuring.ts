declare class A {
	#foo: number;
}
const a = new A();
const { #foo: bar } = a;
