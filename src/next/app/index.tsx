import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { fetchCurrentSlug } from '../_fetch.js'

export interface SlugRedirectProps {
  slug: string
  collectionType: string
  locale: string
  cmsUrl: string
  /**
   * Build the redirect destination URL from the resolved slug and locale.
   * Defaults to `/${locale}/${collectionType}/${newSlug}`.
   */
  buildUrl?: (newSlug: string, locale: string, collectionType: string) => string
  /** Default: 'slug-redirects' */
  redirectsCollection?: string
  /** The document field to read the current slug from. Default: 'slug' */
  slugField?: string
  /** Fallback locale passed to the CMS when fetching the document. Default: none (uses CMS default). */
  fallbackLocale?: string
  /** Use a permanent (308) or temporary (307) redirect. Default: true (308). */
  permanent?: boolean
}

/**
 * App Router React Server Component — drop in when a document is not found by slug.
 * Queries the CMS for a slug redirect record and redirects to the current URL,
 * or calls `notFound()` if no redirect exists.
 *
 * @example
 * // app/[locale]/case-studies/[slug]/page.tsx
 * if (!caseStudy) {
 *   return (
 *     <SlugRedirect
 *       slug={slug}
 *       collectionType="case-studies"
 *       locale={locale}
 *       cmsUrl={process.env.CMS_URL!}
 *       buildUrl={(s, l) => `/${l}/case-studies/${s}`}
 *     />
 *   )
 * }
 */
export async function SlugRedirect({
  slug,
  collectionType,
  locale,
  cmsUrl,
  buildUrl,
  redirectsCollection,
  slugField,
  fallbackLocale,
  permanent = true,
}: SlugRedirectProps): Promise<never> {
  const newSlug = await fetchCurrentSlug({
    fromSlug: slug,
    locale,
    collectionType,
    cmsUrl,
    redirectsCollection,
    slugField,
    fallbackLocale,
  })

  if (!newSlug) return notFound()

  const destination = buildUrl
    ? buildUrl(newSlug, locale, collectionType)
    : `/${locale}/${collectionType}/${newSlug}`

  return permanent ? permanentRedirect(destination) : redirect(destination)
}
