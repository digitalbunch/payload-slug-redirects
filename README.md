<p align="center">
  <h1 align="center">📦 payload-slug-redirects</h1>
  <p align="center">
    Automatic slug-change redirects for PayloadCMS v3 — zero config, zero 404s.
  </p>
  <p align="center">
    <img src="https://img.shields.io/npm/v/payload-slug-redirects?style=flat-square&color=black" alt="npm version" />
    <img src="https://img.shields.io/badge/payload-v3-black?style=flat-square" alt="PayloadCMS v3" />
    <img src="https://img.shields.io/badge/next.js-≥14-black?style=flat-square" alt="Next.js" />
    <img src="https://img.shields.io/badge/license-MIT-black?style=flat-square" alt="MIT" />
    <img src="https://img.shields.io/badge/tests-77%20passing-black?style=flat-square" alt="tests" />
  </p>
</p>

---

When an editor renames a page in PayloadCMS, the URL slug changes. Anyone with the old link gets a 404.

**payload-slug-redirects** fixes this automatically — it tracks every slug change, stores a redirect record, and lets your Next.js frontend issue a 301 to the current URL. No rebuild. No manual work. Chained renames (A → B → C) resolve correctly without any cleanup.

---

## ⚡ Install

```bash
npm install payload-slug-redirects
# or
pnpm add payload-slug-redirects
```

---

## 🚀 Quick start

```ts
// payload.config.ts
import { slugRedirectsPlugin } from 'payload-slug-redirects'

export default buildConfig({
  plugins: [
    slugRedirectsPlugin({
      collections: ['posts', 'case-studies'],
      locales: ['en', 'ar'],             // omit for single-language sites
    }),
  ],
})
```

That's it. The plugin:

- 🔌 Injects the slug field into watched collections automatically
- 🪝 Adds an `afterChange` hook that records every slug change
- 🗃️ Creates a `slug-redirects` collection in your database

---

## 🔍 How it works

```
✏️  Editor publishes a renamed document
        │
        ▼
🪝  afterChange hook compares old slug ↔ new slug
        │
        ├─ unchanged → do nothing
        │
        └─ changed   → 💾 save { fromSlug, locale, collectionType, documentId }
                          └─ 🔄 production only: call revalidateUrl (fire-and-forget)


🌐  Visitor hits the old URL
        │
        ▼
🔎  Frontend queries slug-redirects where fromSlug = old slug
        │
        ├─ no record → 404
        │
        └─ found → fetch current slug by documentId → 301 redirect ✅
```

> 🔗 **Smart chaining:** Redirect records store the document ID, not the new slug. So if a slug changes A → B → C, both old records still resolve to C — automatically, forever.

---

## 💉 Slug field auto-injection

The plugin injects the slug field into your watched collections — no manual field definition needed.

| Site type | Config | Injected field |
|-----------|--------|----------------|
| 🌍 Single language | `collections: ['posts']` | `{ name: 'slug', type: 'text' }` |
| 🌐 Multi language | `collections: ['posts'], locales: ['en', 'ar']` | `{ name: 'localizedSlugs', type: 'json' }` |

If the field already exists on your collection, it is left untouched.

> ⚠️ **Why `json` and not `localized: true`?** Payload v3 returns only the current locale's value in `afterChange` hooks — not an object with all locales. A single `json` field storing `{"en":"my-post","ar":"مقالتي"}` is the only reliable way to track per-locale slug changes.

---

## ⚙️ Options

```ts
slugRedirectsPlugin({
  collections: ['posts'],              // required — watch these collections

  locales: ['en', 'ar'],               // default: ['en']

  slugField: 'localizedSlugs',         // default: 'slug' (single) or 'localizedSlugs' (multi)

  revalidateUrl: 'https://mysite.com/api/revalidate',  // called after each redirect (prod only)

  collection: {
    name: 'my-redirects',              // default: 'slug-redirects'
    visibleInTheUI: false,             // default: true
    onChange: ({ fromSlug, toSlug, locale, collectionType }) => { ... },
  },
})
```

### 🎛️ Per-collection overrides

```ts
slugRedirectsPlugin({
  collections: [
    'posts',                           // shorthand — uses plugin defaults
    {
      name: 'case-studies',
      slugField: 'customSlugField',    // override slug field for this collection only
      onChange: ({ fromSlug, toSlug, locale }) => {
        console.log(`${locale}: ${fromSlug} → ${toSlug}`)
      },
    },
  ],
  locales: ['en', 'ar'],
})
```

### 📋 Options reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collections` | `Array<string \| CollectionEntry>` | required | Collections to watch |
| `locales` | `string[]` | `['en']` | Locale codes to track |
| `slugField` | `string` | auto | `'slug'` for single locale, `'localizedSlugs'` for multi |
| `revalidateUrl` | `string` | — | Revalidation endpoint URL (production only) |
| `collection.name` | `string` | `'slug-redirects'` | Custom collection slug |
| `collection.visibleInTheUI` | `boolean` | `true` | Show in admin sidebar |
| `collection.onChange` | `(args) => void` | — | Fires on any slug change |

---

## ⚛️ Next.js — App Router

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
        buildUrl={(s, l) => `/${l}/posts/${s}`}
      />
    )
  }

  return <PostView post={post} />
}
```

`<SlugRedirect />` is a React Server Component. It either calls `redirect()` (308) or `notFound()` — it never renders HTML.

---

## 📄 Next.js — Pages Router

```ts
// pages/posts/[slug].tsx — getStaticProps
import { resolveSlugRedirect } from 'payload-slug-redirects/next/pages'

if (!post) {
  const redirect = await resolveSlugRedirect({
    fromSlug: slug,
    locale: locale ?? 'en',
    collectionType: 'posts',
    cmsUrl: process.env.NEXT_PUBLIC_CMS_API_URL!,
    buildUrl: (s, l) => l === 'ar' ? `/ar/posts/${s}` : `/posts/${s}`,
  })
  if (redirect) return redirect        // { redirect: { destination, permanent: true } }
  return { notFound: true }
}
```

---

## 🛣️ Optional API route

Expose a dedicated endpoint for client-side redirect lookups:

```ts
// pages/api/slug-redirects.ts
import { createSlugRedirectHandler } from 'payload-slug-redirects/next'

export default createSlugRedirectHandler({
  cmsUrl: process.env.NEXT_PUBLIC_CMS_API_URL!,
})
```

```
GET /api/slug-redirects?fromSlug=old-slug&locale=en&collectionType=posts
→ 200  { slug: 'new-slug' }
→ 404  { error: 'No redirect found' }
```

---

## 🗃️ The `slug-redirects` collection

Auto-created by the plugin. Visible in the admin UI under the **System** group.

| Field | Type | Description |
|-------|------|-------------|
| `fromSlug` | text, indexed | The old slug |
| `locale` | select | Locale this redirect applies to |
| `collectionType` | select | Collection the document belongs to |
| `documentId` | number | Document ID — used to fetch the current slug |

---

## 📦 Exports

| Import path | Exports |
|-------------|---------|
| `payload-slug-redirects` | `slugRedirectsPlugin` · `buildSlugRedirectsCollection` · `createRedirectOnSlugChange` |
| `payload-slug-redirects/next/app` | `<SlugRedirect />` RSC |
| `payload-slug-redirects/next/pages` | `resolveSlugRedirect()` |
| `payload-slug-redirects/next` | `createSlugRedirectHandler()` |

---

## 🛠️ Requirements

- PayloadCMS `^3.0.0`
- Next.js `>=14.0.0` *(optional — only needed for Next.js utilities)*
- Node.js with ESM support

---

## 📄 License

MIT
