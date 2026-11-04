# Current 3.2.0-alechemy integration

The publishing gate now runs the full `npm run eslint` and `npm test`, followed
by package dry-run. The full local ESLint check passes after excluding generated
mutation sandboxes/reports and configuring the new test projects. This supersedes
the historical limited-lint gate and finding counts below. Workflows remain local;
no package has been published or branch pushed.

## Workflow setup and historical rollout notes

# npm publishing

The `Publish` GitHub Actions workflow checks and publishes `@radomiej/roblox-ts` when a commit reaches `main`. It installs the sibling `Radomiej/compiler-types` repository from its `main` branch because roblox-ts uses that checkout for its local compiler-types dependencies. It runs the scoped `lint:js` gate, the project tests, and an npm package dry run before attempting to publish. The broader historical `eslint:ci` command still reports 1,303 existing findings (81 errors and 1,222 warnings), so this publishing gate limits linting to the new JavaScript support surface instead of claiming the full repository lint is clean.

The Build, ESLint, Unit Tests, Test create-roblox-ts, and Build Playground workflows also check out `Radomiej/compiler-types` into a sibling directory and use Node.js 24 with frozen npm installs for the roblox-ts package. Unit Tests installs the checked-in `tests` lockfile instead of rewriting it with a live GitHub dependency update. Its Lune and Rojo downloads are pinned to known versions and verified with SHA-256 checksums. The legacy ESLint workflow remains enabled with its full `eslint:ci` command; it currently reports the baseline findings described above and is not treated as a clean lint gate.

Publishing uses npm Trusted Publishing through GitHub Actions OIDC and generates npm provenance. The workflow reads the package name and version from `package.json`. If that exact version is already on npm, it skips publishing; an npm lookup error other than a clear 404 fails the run. Prerelease versions publish under the `beta` dist-tag; stable versions publish under `latest`.

After merging this workflow to `main`, configure the package's **Trusted Publisher** in npm package settings:

- Provider: GitHub Actions
- Organization or user: `Radomiej`
- Repository: `roblox-ts`
- Workflow filename: `Publish.yml`
- Environment: leave unset; this workflow does not use a GitHub environment

Do not add an npm access token to GitHub secrets. To release a new version, update `package.json` through the normal source change and merge it to `main`; the workflow will publish it if that version is not already present. The package is published with public access and provenance.
