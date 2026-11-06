# payload-slug-redirects

Records slug changes in PayloadCMS v3 and gives your Next.js frontend what it needs to send visitors from an old URL to the current one.

Redirect records store the document ID instead of the destination slug, so after renames from A to B to C, both old URLs resolve to C.

[![npm version](https://img.shields.io/npm/v/payload-slug-redirects?style=flat-square&color=black)](https://www.npmjs.com/package/payload-slug-redirects)
[![MIT license](https://img.shields.io/badge/license-MIT-black?style=flat-square)](./LICENSE)

## Install

```bash
pnpm add payload-slug-redirects
```

Requires PayloadCMS `^3.0.0` and Node.js 20 or later. The Next.js helpers require Next.js `>=14.0.0`.

## Quick start

```ts
// payload.config.ts
import { slugRedirectsPlugin } from 'payload-slug-redirects'

export default buildConfig({
  plugins: [
    slugRedirectsPlugin({
      collections: ['posts', 'case-studies'],
    }),
  ],
})
```

The plugin adds an `afterChange` hook to each watched collection and creates a `slug-redirects` collection. When a published document's slug changes, the hook records the old slug. When a visitor hits a URL with no matching document, the frontend helpers look up that slug and redirect to the document's current slug.

## Slug field

If a watched collection has no slug field, the plugin adds one. An existing field, including one from Payload's [`slugField()`](https://payloadcms.com/docs/fields/text#slug-field), is left alone.

| Site | Default field | Type |
|------|---------------|------|
| Single locale | `slug` | text |
| Multiple locales | `localizedSlugs` | json |

On multi-locale sites the hook needs every locale's slug on each save, but Payload only passes the current locale to `afterChange` for `localized: true` fields. Redirects are therefore tracked from a JSON field shaped like `{ "en": "my-post", "ar": "..." }`.

The plugin creates `localizedSlugs` but does not fill it. Your project has to write that value on save, for example in a `beforeChange` hook. If it stays empty, no redirects are recorded.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collections` | `Array<string \| CollectionEntry>` | required | Collections to watch |
| `enabled` | `boolean` | `true` | Disable the plugin without removing it |
| `locales` | `string[]` | `['en']` | Locale codes to track |
| `slugField` | `string` | see above | Field holding the slug |
| `revalidateUrl` | `string` | -- | Called with the old slug after a change, in production only |
| `revalidateHeaders` | `Record<string, string>` | -- | Headers for revalidation requests |
| `collection.name` | `string` | `'slug-redirects'` | Collection slug |
| `collection.visibleInTheUI` | `boolean` | `true` | Show in the admin sidebar |
| `collection.onChange` | `(args) => void \| Promise<void>` | -- | Fires on any slug change |

Entries in `collections` can override `slugField` and add their own `onChange`:

```ts
slugRedirectsPlugin({
  collections: [
    'posts',
    {
      name: 'case-studies',
      slugField: 'customSlugField',
      onChange: ({ fromSlug, toSlug, locale, collectionType }) => {},
    },
  ],
})
```

## Next.js

The helpers below also accept `redirectsCollection` for a custom `collection.name`, `slugField` when the frontend slug field is not `slug`, and `fallbackLocale`.

### App Router

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
        buildUrl={(slug, locale) => `/${locale}/posts/${slug}`}
      />
    )
  }

  return <PostView post={post} />
}
```

`SlugRedirect` is a server component that calls `permanentRedirect()` (308) or `notFound()`. Pass `permanent={false}` for a 307.

### Pages Router

```ts
// pages/posts/[slug].tsx, inside getStaticProps
import { resolveSlugRedirect } from 'payload-slug-redirects/next/pages'

if (!post) {
  const redirect = await resolveSlugRedirect({
    fromSlug: slug,
    locale: locale ?? 'en',
    collectionType: 'posts',
    cmsUrl: process.env.NEXT_PUBLIC_CMS_API_URL!,
    buildUrl: (s, l) => (l === 'ar' ? `/ar/posts/${s}` : `/posts/${s}`),
  })
  if (redirect) return redirect
  return { notFound: true }
}
```

Pass `permanent: false` for a temporary redirect.

### API route

An optional endpoint for client-side lookups:

```ts
// pages/api/slug-redirects.ts
import { createSlugRedirectHandler } from 'payload-slug-redirects/next'

export default createSlugRedirectHandler({
  cmsUrl: process.env.NEXT_PUBLIC_CMS_API_URL!,
})
```

`GET /api/slug-redirects?fromSlug=old-slug&locale=en&collectionType=posts` returns `{ slug: 'new-slug' }`, or 404 if there is no redirect and 400 for invalid parameters.

## Access control

Records hold `fromSlug`, `locale`, `collectionType` and `documentId`.

| Operation | Allowed for |
|-----------|-------------|
| Read | Everyone, because the Next.js helpers fetch without credentials |
| Create, update | Nobody except the plugin's hook |
| Delete | Users from the collection set in `admin.user` |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Report vulnerabilities through [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
