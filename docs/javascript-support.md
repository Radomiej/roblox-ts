# JavaScript source support

roblox-ts can compile JavaScript source files when `allowJs` is enabled in the project's `tsconfig.json`. JavaScript checking is opt-in through TypeScript's `checkJs`; JSDoc annotations can supply types for checked JavaScript.

```json
{
	"compilerOptions": {
		"allowJs": true,
		"checkJs": true
	}
}
```

With `allowJs` enabled, `.js` and `.jsx` files can be compiled alongside TypeScript files, including mixed JavaScript/TypeScript imports. JavaScript module imports resolve through the compiler's existing Roblox path rules. Output files use `.luau` by default (or `.lua` when that output mode is selected), and `index.js`/`index.jsx` map to `init.luau` (or `init.lua`), matching the existing TypeScript module convention. Declaration output remains available when the project's declaration settings enable it. The compiler also tracks JavaScript inputs during incremental builds and watch mode, including cleanup of stale outputs and copying of non-source assets.

JavaScript files are not compiled when `allowJs` is disabled; they remain ordinary assets. Existing roblox-ts language and runtime restrictions still apply to compiled JavaScript. This support does not provide Node.js or browser APIs, and arbitrary npm JavaScript libraries are not automatically compatible with Roblox. `.mjs` and `.cjs` are outside the supported source extensions.

## Running the focused checks

From the roblox-ts repository, run:

```sh
npm run test:js
npm run test:js:coverage
npm run test:mutation
```

The first command runs the focused JavaScript-support Jest suite. The coverage command adds Jest coverage reporting; the mutation command runs Stryker against the configured JavaScript-support targets.

For generated Node-versus-Luau tests, replay seeds, known array limitations and
mutation coverage, see [property-testing.md](property-testing.md).
