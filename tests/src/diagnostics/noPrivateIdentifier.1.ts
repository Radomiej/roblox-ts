class Foo {
	#bar = 1;
	method() {
		const { #bar: val } = this;
	}
}
