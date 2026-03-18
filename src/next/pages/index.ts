import { fetchCurrentSlug } from '../_fetch.js'

export interface ResolveSlugRedirectOptions {
  fromSlug: string
  locale: string
  collectionType: string
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

export interface RedirectResult {
  redirect: {
    destination: string
    permanent: boolean
  }
}

/**
 * Pages Router `getStaticProps` helper — call when a document is not found by slug.
 * Queries the CMS for a slug redirect record and returns a Next.js redirect object,
 * or `null` if no redirect exists (caller should return `{ notFound: true }`).
 *
 * @example
 * // pages/case-studies/[slug].tsx — getStaticProps
 * if (!caseStudy) {
 *   const slugRedirect = await resolveSlugRedirect({
 *     fromSlug: slug,
 *     locale: locale ?? 'en',
 *     collectionType: 'case-studies',
 *     cmsUrl: process.env.NEXT_PUBLIC_CMS_API_URL!,
 *     buildUrl: (s, l) => l === 'ar' ? `/ar/case-studies/${s}` : `/case-studies/${s}`,
 *   })
 *   if (slugRedirect) return slugRedirect
 *   return { notFound: true }
 * }
 */
export async function resolveSlugRedirect(
  options: ResolveSlugRedirectOptions,
): Promise<RedirectResult | null> {
  const { fromSlug, locale, collectionType, cmsUrl, buildUrl, redirectsCollection, slugField } = options

  const newSlug = await fetchCurrentSlug({ fromSlug, locale, collectionType, cmsUrl, redirectsCollection, slugField })
  if (!newSlug) return null

  return {
    redirect: {
      destination: buildUrl ? buildUrl(newSlug, locale) : `/${locale}/${collectionType}/${newSlug}`,
      permanent: true,
    },
  }
}
