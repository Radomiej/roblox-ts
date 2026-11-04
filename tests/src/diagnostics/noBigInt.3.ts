const foo = {};
// @ts-expect-error
const { 100n: val } = foo;
