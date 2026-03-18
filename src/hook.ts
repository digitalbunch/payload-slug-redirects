import type { CollectionAfterChangeHook } from 'payload'
import type { CollectionEntry, SlugRedirectsCollectionOptions } from './types.js'

/**
 * Extracts per-locale slugs from a document field, auto-detecting the storage pattern:
 *
 * - **Plain object** `{ en: 'my-slug', ar: '...' }` — standard Payload i18n localized field
 * - **JSON string** `'{"en":"my-slug","ar":"..."}'` — custom JSON blob field
 * - **Plain string** `'my-slug'` — non-localized field, applied to all tracked locales
 */
export function extractSlugs(
  record: Record<string, unknown>,
  slugField: string,
  locales: string[],
): Record<string, string> {
  const raw = record[slugField]
  if (!raw) return {}

  // Standard Payload i18n — localized field exposed as object { en: '...', ar: '...' }
  if (Array.isArray(raw)) return {}
  if (typeof raw === 'object') return raw as Record<string, string>

  if (typeof raw === 'string') {
    // Try JSON blob pattern — '{"en":"my-slug","ar":"..."}'
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed !== null && typeof parsed === 'object') return parsed as Record<string, string>
    } catch {
      // Not JSON — fall through to plain string
    }
    // Plain non-localized string — apply to all tracked locales
    return Object.fromEntries(locales.map((l) => [l, raw]))
  }

  return {}
}

export const createRedirectOnSlugChange = (
  collections: CollectionEntry[],
  locales: string[],
  revalidateUrl?: string,
  collectionOptions?: SlugRedirectsCollectionOptions,
): CollectionAfterChangeHook => {
  const collectionSlug = collectionOptions?.name ?? 'slug-redirects'

  return async ({ doc, previousDoc, req, operation, collection }) => {
    if (operation !== 'update' || !previousDoc) return doc
    const status = (doc as { _status?: string })._status
    if (status !== undefined && status !== 'published') return doc

    const collectionType = collection.slug
    const entry = collections.find((c) => c.name === collectionType)
    if (!entry) return doc

    const slugField = entry.slugField ?? 'slug'

    let prevSlugs: Record<string, string> = {}
    let currSlugs: Record<string, string> = {}
    try {
      prevSlugs = extractSlugs(previousDoc as Record<string, unknown>, slugField, locales)
      currSlugs = extractSlugs(doc as Record<string, unknown>, slugField, locales)
    } catch {
      return doc
    }

    for (const locale of locales) {
      const oldSlug = prevSlugs[locale]
      const newSlug = currSlugs[locale]
      if (!oldSlug || !newSlug || oldSlug === newSlug) continue

      try {
        await req.payload.create({
          collection: collectionSlug,
          data: { fromSlug: oldSlug, locale, collectionType, documentId: doc.id as number },
        })
        req.payload.logger.info(
          `[slug-redirects] ${collectionType}[${locale}] ${oldSlug} → doc #${String(doc.id)} (now ${newSlug})`
        )

        const callbackArgs = { fromSlug: oldSlug, toSlug: newSlug, collectionType, locale }
        entry.onChange?.(callbackArgs)
        collectionOptions?.onChange?.(callbackArgs)

        if (revalidateUrl && process.env.NODE_ENV === 'production') {
          const url = `${revalidateUrl}?type=${encodeURIComponent(collectionType)}&slug=${encodeURIComponent(oldSlug)}`
          fetch(url).catch((err) => {
            req.payload.logger.error({ err }, `[slug-redirects] Failed to revalidate old slug path: ${url}`)
          })
        }
      } catch (err) {
        req.payload.logger.error({ err }, '[slug-redirects] Failed to create slug redirect')
      }
    }

    return doc
  }
}
