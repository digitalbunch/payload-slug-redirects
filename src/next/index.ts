/**
 * Shared Next.js utilities — router-agnostic.
 * For router-specific exports use:
 *   `payload-slug-redirects/next/app`   — App Router <SlugRedirect /> RSC
 *   `payload-slug-redirects/next/pages` — Pages Router resolveSlugRedirect()
 */

import { fetchCurrentSlug } from './_fetch.js'

export interface CreateSlugRedirectHandlerConfig {
  cmsUrl: string
  /** Default: 'slug-redirects' */
  redirectsCollection?: string
  /** The document field to read the current slug from. Default: 'slug' */
  slugField?: string
}

/**
 * Factory for a Next.js Pages Router API route that resolves slug redirects.
 * Optional — consumers can query the CMS directly from `getStaticProps` instead.
 *
 * Drop into `pages/api/slug-redirects.ts`:
 * @example
 * import { createSlugRedirectHandler } from 'payload-slug-redirects/next'
 * export default createSlugRedirectHandler({ cmsUrl: process.env.NEXT_PUBLIC_CMS_API_URL! })
 *
 * Query: GET /api/slug-redirects?fromSlug=old-slug&locale=en&collectionType=case-studies
 * Response: `{ slug: 'new-slug' }` or 404
 */
export function createSlugRedirectHandler(config: CreateSlugRedirectHandlerConfig) {
  return async function slugRedirectHandler(
    req: { query: Record<string, string | string[] | undefined> },
    res: {
      status: (code: number) => { json: (body: unknown) => void }
      json: (body: unknown) => void
    },
  ): Promise<void> {
    const fromSlug = Array.isArray(req.query.fromSlug) ? req.query.fromSlug[0] : req.query.fromSlug
    const locale = Array.isArray(req.query.locale) ? req.query.locale[0] : req.query.locale
    const collectionType = Array.isArray(req.query.collectionType)
      ? req.query.collectionType[0]
      : req.query.collectionType

    if (!fromSlug || !locale || !collectionType) {
      res.status(400).json({ error: 'Missing required query params: fromSlug, locale, collectionType' })
      return
    }

    const newSlug = await fetchCurrentSlug({
      fromSlug,
      locale,
      collectionType,
      cmsUrl: config.cmsUrl,
      redirectsCollection: config.redirectsCollection,
      slugField: config.slugField,
    })

    if (!newSlug) {
      res.status(404).json({ error: 'No redirect found' })
      return
    }

    res.json({ slug: newSlug })
  }
}
