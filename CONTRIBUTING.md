# Contributing

Thanks for considering a contribution. Here's how to get started.

## Setup

```bash
git clone git@github.com:digitalbunch/payload-slug-redirects.git
cd payload-slug-redirects
pnpm install
```

## Development workflow

```bash
pnpm test          # run tests (vitest)
pnpm typecheck     # type-check with tsc
pnpm build         # build dist/ with tsup
pnpm dev           # watch mode (tsup --watch)
```

All three checks (test, typecheck, build) must pass before submitting a PR.

## Making changes

1. Fork the repo and create a branch from `main`.
2. Write a failing test for the change you want to make.
3. Implement the change until the test passes.
4. Run `pnpm typecheck && pnpm test && pnpm build` to confirm nothing else broke.
5. Open a PR against `main`.

## Code style

- TypeScript strict mode. No `any` in source files (tests are fine).
- Do not mutate incoming Payload config objects. Spread into new objects.
- Frontend utilities (`src/next/`) must not import from `payload`. They use `fetch` only.
- Keep the plugin surface small. If a feature can live in userland, it probably should.

## Releases

Releases are managed by maintainers. The process:

1. Update `version` in `package.json` following semver.
2. Commit, push to `main`, and create a GitHub Release with a `vX.Y.Z` tag.
3. The release workflow publishes to npm automatically.

## Reporting issues

Open a GitHub issue. Include your Payload version, Node version, and a minimal reproduction if possible.
