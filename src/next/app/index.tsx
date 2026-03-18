import { notFound, redirect } from 'next/navigation'
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
  buildUrl?: (newSlug: string, locale: string) => string
  /** Default: 'slug-redirects' */
  redirectsCollection?: string
  /** The document field to read the current slug from. Default: 'slug' */
  slugField?: string
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
}: SlugRedirectProps): Promise<never> {
  const newSlug = await fetchCurrentSlug({
    fromSlug: slug,
    locale,
    collectionType,
    cmsUrl,
    redirectsCollection,
    slugField,
  })

  if (!newSlug) return notFound()

  const destination = buildUrl
    ? buildUrl(newSlug, locale)
    : `/${locale}/${collectionType}/${newSlug}`

  return redirect(destination)
}
