# payload-slug-redirects

A public PayloadCMS v3 plugin package. Changes here ship to npm — treat every edit carefully.

## Commands

```bash
npm test                                        # run all tests (vitest)
npm test -- src/tests/plugin.test.ts            # run a single test file
npm run test:watch                              # watch mode
npm run typecheck                               # tsc --noEmit
npm run build                                   # tsup — builds dist/
```

Always run both `typecheck` and `test` before considering any change done.

## Rules

- **TDD is mandatory.** Write the failing test first, watch it fail, then implement. No exceptions.
- **Never skip typecheck.** This is a typed public API — broken types break consumers.
- **Do not mutate incoming Payload config.** Always spread into new objects.
- **Do not import `payload` in `src/next/`.** Frontend utilities use raw `fetch` only — they must work in any environment.

## Key conventions

**Slug field defaults**
- Single locale (`['en']`) → `slugField` defaults to `'slug'`, injected as `type: 'text'`
- Multiple locales → `slugField` defaults to `'localizedSlugs'`, injected as `type: 'json'`
- Injection is skipped if the field already exists on the collection

**Why `json` and not `localized: true`**
Payload v3 `afterChange` hooks return only the current locale's string for `localized: true` fields — not an object. A `json` blob field is the only reliable way to track per-locale slugs.

**`revalidateUrl` behaviour**
Fires only after a successful `payload.create` call, and only in `NODE_ENV=production`. Failures are caught and logged — they must never block the Payload save.

**`satisfies Plugin` — not `: Plugin`**
The inner function in `src/index.ts` uses `satisfies Plugin` instead of `: Plugin`. This preserves the narrower `Config` return type (not `Config | Promise<Config>`), which lets tests access `result.collections` without TypeScript errors.

## Source structure

```
src/
├── index.ts          ← Plugin entry — normalizes config, injects fields + hooks
├── types.ts          ← All TypeScript interfaces (no logic)
├── collection.ts     ← Builds the slug-redirects collection dynamically
├── hook.ts           ← afterChange hook factory + extractSlugs helper
└── next/
    ├── _fetch.ts     ← Shared fetch logic — internal only, never exported
    ├── index.ts      ← createSlugRedirectHandler (optional API route)
    ├── app/          ← <SlugRedirect /> React Server Component
    └── pages/        ← resolveSlugRedirect() for getStaticProps
```

## Test files

| File | What it covers |
|------|---------------|
| `plugin.test.ts` | Plugin config normalization, field injection, hook wiring |
| `hook.test.ts` | `createRedirectOnSlugChange` — all guard conditions and redirect creation |
| `extractSlugs.test.ts` | `extractSlugs` — JSON blob, plain string, object, edge cases |
| `collection.test.ts` | `buildSlugRedirectsCollection` — fields, options, labels |
| `fetch.test.ts` | `fetchCurrentSlug` — HTTP calls, null cases, slugField param |
| `next.test.ts` | `createSlugRedirectHandler` and `resolveSlugRedirect` |
