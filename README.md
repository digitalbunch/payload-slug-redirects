# payload-slug-redirects

Automatic slug-change redirects for PayloadCMS v3. When an editor renames a page, the old URL stops working. This plugin records every slug change and gives your Next.js frontend the data it needs to issue a permanent redirect to the current URL.

Chained renames work automatically. If a slug changes from A to B to C, both old URLs resolve to C because redirect records store the document ID, not the destination slug.

[![npm version](https://img.shields.io/npm/v/payload-slug-redirects?style=flat-square&color=black)](https://www.npmjs.com/package/payload-slug-redirects)
[![MIT license](https://img.shields.io/badge/license-MIT-black?style=flat-square)](./LICENSE)

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Working with Payload's native slug field](#working-with-payloads-native-slug-field)
- [Slug field injection](#slug-field-injection)
- [Options](#options)
- [Next.js App Router](#nextjs--app-router)
- [Next.js Pages Router](#nextjs--pages-router)
- [API route handler](#api-route-handler)
- [The slug-redirects collection](#the-slug-redirects-collection)
- [Exports](#exports)
- [Requirements](#requirements)
- [Contributing](#contributing)
- [License](#license)

## Install

```bash
npm install payload-slug-redirects
# or
pnpm add payload-slug-redirects
```

## Quick start

```ts
// payload.config.ts
import { slugRedirectsPlugin } from 'payload-slug-redirects'

export default buildConfig({
  plugins: [
    slugRedirectsPlugin({
      collections: ['posts', 'case-studies'],
      locales: ['en', 'ar'],  // omit for single-language sites
    }),
  ],
})
```

The plugin does three things:

1. Injects a slug field into watched collections (unless one already exists).
2. Adds an `afterChange` hook that records slug changes.
3. Creates a `slug-redirects` collection in your database.

## How it works

When an editor saves a document with a changed slug, the `afterChange` hook compares the old and new values. If they differ, it creates a redirect record with the old slug, locale, collection type, and document ID.

On the frontend, when a visitor hits a URL that doesn't match any document, you query the `slug-redirects` collection for the old slug. If a record exists, you fetch the document by its stored ID to get the current slug, then redirect.

Because records point to document IDs (not destination slugs), chain renames resolve correctly without cleanup.

## Working with Payload's native slug field

Payload v3 ships with a built-in [`slugField()`](https://payloadcms.com/docs/fields/text#slug-field) helper that auto-generates URL-friendly slugs from a source field like `title`:

```ts
import { slugField } from 'payload'

export const Pages: CollectionConfig = {
  slug: 'pages',
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField({ fieldToUse: 'title' }),
  ],
}
```

This plugin is fully compatible with it. When a slug field already exists on a collection, the plugin skips injection and only adds the `afterChange` hook for redirect tracking.

**Single-locale sites** work out of the box. The native `slugField()` creates a `slug` text field, and the plugin reads it directly in the hook.

**Multi-locale sites** need one extra step. Payload's native `slugField({ localized: true })` stores per-locale values using Payload's built-in localization. The problem is that `afterChange` hooks only receive the current locale's string value, not an object with all locales. The hook sees `"my-post"` instead of `{ en: "my-post", ar: "..." }`, which means it can't detect slug changes in other locales from a single save.

The workaround: let the plugin inject its own `localizedSlugs` JSON field for internal change tracking, and keep using the native slug field for your frontend. They serve different purposes and coexist without conflict:

```ts
slugRedirectsPlugin({
  collections: ['pages'],
  locales: ['en', 'ar'],
  // slugField defaults to 'localizedSlugs' for multi-locale setups
  // Your native slugField('slug') is untouched -- the plugin adds a separate field
})
```

## Slug field injection

If you don't use Payload's native `slugField()`, the plugin injects one for you:

| Site type | Config | Injected field |
|-----------|--------|----------------|
| Single language | `collections: ['posts']` | `{ name: 'slug', type: 'text' }` |
| Multi language | `collections: ['posts'], locales: ['en', 'ar']` | `{ name: 'localizedSlugs', type: 'json' }` |

If the field already exists on your collection, the plugin leaves it alone.

## Options

```ts
slugRedirectsPlugin({
  enabled: true,                         // set false to disable without removing
  collections: ['posts'],                // required
  locales: ['en', 'ar'],                 // default: ['en']
  slugField: 'localizedSlugs',           // default: 'slug' or 'localizedSlugs'
  revalidateUrl: 'https://mysite.com/api/revalidate',
  revalidateHeaders: {                   // sent with revalidation requests
    Authorization: 'Bearer secret',
  },
  collection: {
    name: 'my-redirects',                // default: 'slug-redirects'
    visibleInTheUI: false,               // default: true
    onChange: async ({ fromSlug, toSlug, locale, collectionType }) => {
      // fires on any slug change -- async callbacks are supported
    },
  },
})
```

### Per-collection overrides

```ts
slugRedirectsPlugin({
  collections: [
    'posts',                             // uses plugin defaults
    {
      name: 'case-studies',
      slugField: 'customSlugField',
      onChange: ({ fromSlug, toSlug, locale }) => {
        console.log(`${locale}: ${fromSlug} -> ${toSlug}`)
      },
    },
  ],
  locales: ['en', 'ar'],
})
```

### Options reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Disable the plugin without removing it from config |
| `collections` | `Array<string \| CollectionEntry>` | required | Collections to watch |
| `locales` | `string[]` | `['en']` | Locale codes to track |
| `slugField` | `string` | auto | `'slug'` for single locale, `'localizedSlugs'` for multi |
| `revalidateUrl` | `string` | -- | Revalidation endpoint URL (production only) |
| `revalidateHeaders` | `Record<string, string>` | -- | Custom headers for revalidation requests |
| `collection.name` | `string` | `'slug-redirects'` | Custom collection slug |
| `collection.visibleInTheUI` | `boolean` | `true` | Show in admin sidebar |
| `collection.onChange` | `(args) => void \| Promise<void>` | -- | Fires on any slug change |

## Next.js -- App Router

```tsx
// app/[locale]/posts/[slug]/page.tsx
import { SlugRedirect } from 'payload-slug-redirects/next/app'

export default async function PostPage({ params }) {
  const post = await getPost(params.slug, params.locale)

  if (!post) {
    return (
      <SlugRedirect
        slug={params.slug}
        collectionType="posts"
        locale={params.locale}
        cmsUrl={process.env.CMS_URL!}
        buildUrl={(slug, locale, collectionType) => `/${locale}/${collectionType}/${slug}`}
      />
    )
  }

  return <PostView post={post} />
}
```

`SlugRedirect` is a React Server Component. It calls `permanentRedirect()` (308) or `notFound()`. It never renders HTML. Pass `permanent={false}` for a temporary redirect (307) instead.

## Next.js -- Pages Router

```ts
// pages/posts/[slug].tsx
import { resolveSlugRedirect } from 'payload-slug-redirects/next/pages'

// inside getStaticProps
if (!post) {
  const redirect = await resolveSlugRedirect({
    fromSlug: slug,
    locale: locale ?? 'en',
    collectionType: 'posts',
    cmsUrl: process.env.NEXT_PUBLIC_CMS_API_URL!,
    buildUrl: (s, l) => l === 'ar' ? `/ar/posts/${s}` : `/posts/${s}`,
  })
  if (redirect) return redirect   // { redirect: { destination, permanent: true } }
  return { notFound: true }
}

// Pass `permanent: false` for a temporary redirect (302) instead of permanent (301).

```

## API route handler

Optional endpoint for client-side redirect lookups:

```ts
// pages/api/slug-redirects.ts
import { createSlugRedirectHandler } from 'payload-slug-redirects/next'

export default createSlugRedirectHandler({
  cmsUrl: process.env.NEXT_PUBLIC_CMS_API_URL!,
})
```

```
GET /api/slug-redirects?fromSlug=old-slug&locale=en&collectionType=posts
200  { slug: 'new-slug' }
404  { error: 'No redirect found' }
```

## The slug-redirects collection

Auto-created by the plugin. Visible in the admin UI under the "System" group by default.

| Field | Type | Description |
|-------|------|-------------|
| `fromSlug` | text, indexed | The old slug |
| `locale` | select | Locale this redirect applies to |
| `collectionType` | select | Source collection |
| `documentId` | text | Document ID (works with both SQL and MongoDB) |

Write access is locked down. Only the plugin's hook can create records (via `overrideAccess`). Admins can delete stale records through the UI.

## Exports

| Import path | Exports |
|-------------|---------|
| `payload-slug-redirects` | `slugRedirectsPlugin`, `buildSlugRedirectsCollection`, `createRedirectOnSlugChange` |
| `payload-slug-redirects/next/app` | `SlugRedirect` (RSC) |
| `payload-slug-redirects/next/pages` | `resolveSlugRedirect()` |
| `payload-slug-redirects/next` | `createSlugRedirectHandler()` |

## Requirements

- PayloadCMS `^3.0.0`
- Next.js `>=14.0.0` (optional, only for the Next.js utilities)
- Node.js 20 or later

## Versioning

This project follows [semver](https://semver.org/). Releases are published to npm via GitHub Releases. See the [release workflow](.github/workflows/release.yml) for details.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
