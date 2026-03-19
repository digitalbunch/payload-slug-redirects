# payload-slug-redirects

A public PayloadCMS v3 plugin package. Changes here ship to npm. Treat every edit carefully.

## Commands

```bash
pnpm test                                        # run all tests (vitest)
pnpm test -- src/tests/plugin.test.ts            # run a single test file
pnpm test:watch                                  # watch mode
pnpm typecheck                                   # tsc --noEmit
pnpm lint                                        # oxlint
pnpm lint:fix                                    # oxlint --fix
pnpm build                                       # tsup -- builds dist/
```

Always run `lint`, `typecheck`, and `test` before considering any change done.

## Rules

- **TDD is mandatory.** Write the failing test first, watch it fail, then implement. No exceptions.
- **Never skip typecheck.** This is a typed public API. Broken types break consumers.
- **Do not mutate incoming Payload config.** Always spread into new objects.
- **Do not import `payload` in `src/next/`.** Frontend utilities use raw `fetch` only. They must work in any environment.

## Key conventions

**Slug field defaults**
- Single locale (`['en']`) -> `slugField` defaults to `'slug'`, injected as `type: 'text'`
- Multiple locales -> `slugField` defaults to `'localizedSlugs'`, injected as `type: 'json'`
- Injection is skipped if the field already exists on the collection

**Why `json` and not `localized: true`**
Payload v3 `afterChange` hooks return only the current locale's string for `localized: true` fields, not an object. A `json` blob field is the only reliable way to track per-locale slugs.

**`revalidateUrl` behavior**
Fires only after a successful `payload.create` call, and only in `NODE_ENV=production`. Supports custom headers via `revalidateHeaders`. Failures are caught and logged. They must never block the Payload save.

**`documentId` is stored as text**
To support both SQL (numeric IDs) and MongoDB (ObjectId strings). The hook converts `doc.id` to a string before saving.

**Access control on the redirects collection**
`create` and `update` are blocked (`() => false`). The hook uses `overrideAccess: true` to bypass this. `read` and `delete` are open. This prevents manual creation of invalid records while allowing admin cleanup.

**`satisfies Plugin` -- not `: Plugin`**
The inner function in `src/index.ts` uses `satisfies Plugin` instead of `: Plugin`. This preserves the narrower `Config` return type (not `Config | Promise<Config>`), which lets tests access `result.collections` without TypeScript errors.

## Source structure

```
src/
├── index.ts          <- Plugin entry: normalizes config, injects fields + hooks
├── types.ts          <- All TypeScript interfaces (no logic)
├── collection.ts     <- Builds the slug-redirects collection dynamically
├── hook.ts           <- afterChange hook factory + extractSlugs helper
└── next/
    ├── _fetch.ts     <- Shared fetch logic (internal, never exported)
    ├── index.ts      <- createSlugRedirectHandler (optional API route)
    ├── app/          <- <SlugRedirect /> React Server Component
    └── pages/        <- resolveSlugRedirect() for getStaticProps
```

## Test files

| File | What it covers |
|------|---------------|
| `plugin.test.ts` | Plugin config normalization, field injection, hook wiring, `enabled` flag |
| `hook.test.ts` | `createRedirectOnSlugChange`: guard conditions, redirect creation, async onChange, revalidation |
| `extractSlugs.test.ts` | `extractSlugs`: JSON blob, plain string, object, edge cases |
| `collection.test.ts` | `buildSlugRedirectsCollection`: fields, options, labels, access control |
| `fetch.test.ts` | `fetchCurrentSlug`: HTTP calls, null cases, slugField param, fallbackLocale |
| `next.test.ts` | `createSlugRedirectHandler` and `resolveSlugRedirect` |
| `slugRedirect.test.ts` | `SlugRedirect` RSC: permanentRedirect, notFound, buildUrl, fallbackLocale |

## Versioning

Semver. Breaking changes (type changes, signature changes) bump the major version. The release workflow publishes to npm when a GitHub Release is created with a `vX.Y.Z` tag.
