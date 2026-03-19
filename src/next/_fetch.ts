/**
 * Not part of the public API surface — used internally by App Router and Pages Router utilities.
 */

export interface FetchSlugOptions {
  fromSlug: string
  locale: string
  collectionType: string
  cmsUrl: string
  /** Default: 'slug-redirects' */
  redirectsCollection?: string
  /** The document field to read the current slug from. Default: 'slug' */
  slugField?: string
  /** Fallback locale passed to the CMS when fetching the document. Default: none (uses CMS default). */
  fallbackLocale?: string
}

/**
 * Looks up a slug redirect record in the CMS and returns the current slug
 * of the target document, or `null` if no redirect exists.
 */
export async function fetchCurrentSlug(options: FetchSlugOptions): Promise<string | null> {
  const { fromSlug, locale, collectionType, cmsUrl, redirectsCollection = 'slug-redirects', slugField = 'slug', fallbackLocale } = options
  const base = cmsUrl.replace(/\/$/, '')

  // 1. Find the redirect record
  const redirectQuery = new URLSearchParams({
    'where[fromSlug][equals]': fromSlug,
    'where[locale][equals]': locale,
    'where[collectionType][equals]': collectionType,
    'limit': '1',
    'depth': '0',
    'sort': '-createdAt',
  })

  const redirectRes = await fetch(`${base}/api/${redirectsCollection}?${redirectQuery.toString()}`)
  if (!redirectRes.ok) return null

  const redirectData = (await redirectRes.json()) as {
    docs: Array<{ documentId: number }>
    totalDocs: number
  }
  if (!redirectData.docs.length) return null

  const { documentId } = redirectData.docs[0]!

  // 2. Fetch current document to get its slug
  const docParams: Record<string, string> = {
    locale,
    depth: '0',
    [`select[${slugField}]`]: 'true',
  }
  if (fallbackLocale) docParams.fallbackLocale = fallbackLocale
  const docQuery = new URLSearchParams(docParams)

  const docRes = await fetch(`${base}/api/${collectionType}/${documentId}?${docQuery.toString()}`)
  if (!docRes.ok) return null

  const doc = (await docRes.json()) as Record<string, string | undefined>
  return doc[slugField] ?? null
}
