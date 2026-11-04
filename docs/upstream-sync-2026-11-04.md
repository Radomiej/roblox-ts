# Current integration: 3.2.0-alechemy

The integration now starts directly from upstream commit
`68648b0c633ef1016009aec7521b528f648ba656` on
`release/3.2.0-alechemy`. It retains upstream's explicit Prereqs and evaluation
planner, then ports alchemy extensions with regression tests. This supersedes
the selective-sync strategy below. The previous stabilized fork is preserved at
`backup/alchemy-stabilized-20261104` (`e20d87c1`).

The upstream string-index transform and its compiler-types declaration are now
both present. Full integration verification is still in progress; earlier test
counts below apply to the old base. New runtime tests have exposed generator
closure/cleanup limitations which must be resolved before release readiness.
Nothing has been pushed or published.

## Historical selective synchronization

# Upstream synchronization record (2026-11-04)

This fork has been selectively synchronized with upstream while retaining its alchemy-specific behavior. The comparison baseline was alchemy commit `829f9b4d` and upstream commit `68648b0c633ef1016009aec7521b528f648ba656`. At that point upstream contained 92 commits beyond the fork's 65 custom commits. A full merge would introduce roughly 90 conflicts, so this work records selected compatible changes instead of claiming a complete merge.

## Retained type changes

The separate `compiler-types` repository was fast-forwarded to upstream `e3804ed`, then its fork-specific definitions were preserved: `Symbol.hasInstance`, `Symbol.dispose`, `Symbol.asyncDispose`, the `Add`/`Sub`/`Mul`/`Div`/`IDiv`/`Mod`/`Pow`/`Concat`/`Eq`/`Lt`/`Le`/`Unm`/`Len` macro interfaces, and `String.startsWith`/`String.endsWith`.

Upstream's newer numeric string index typing was deliberately not enabled. It depends on a corresponding compiler transform that this alchemy fork does not have. The root repository uses a sibling `../compiler-types` file dependency in place of its inaccessible submodule and corrupt tarball dependency, and tests resolve that sibling repository as `../../compiler-types`. The configured Roblox API types version is `@rbxts/types` `1.0.960`.

## Selected compiler fixes

Two compatible source fixes were transferred:

- Scoped package names are recognized by the package naming regular expression (`e0b1096b`), with additional checks rejecting malformed whitespace and path-like names.
- `yield*` forwards the next input to the delegated iterator (`543040fa`), adapted to this fork's `Prereqs.prereq` representation.

The diagnostic span behavior from upstream commit `29389609` was already present in alchemy, so it did not require a separate change.

## Compatibility boundary

TypeScript is pinned to `5.9.3`; the scoped compiler hook and exact version address the transformer mismatch seen with this compiler version. Updating API types surfaced four compile errors in the Shooter example that use the newer `User` type. Three gamepass calls now use `player.User`. One compile error remains in `LeaderboardService.ts`: persisted legacy numeric user IDs cannot safely be passed to the new `User` API or wrapped in `User.fromId`. See the Shooter repository's `docs/user-api-migration.md`. The full game build is not passing.

The work is a selective stabilization, not a complete upstream merge. The outstanding upstream commits and the unresolved compatibility items should be assessed before describing the fork as fully synchronized or treating a game build as verified.
