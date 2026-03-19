import type { CollectionConfig, OptionObject } from 'payload'
import type { CollectionEntry, SlugRedirectsCollectionOptions } from './types.js'

const KNOWN_LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  ar: 'Arabic',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
}

function toLabel(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function toLocaleLabel(locale: string): string {
  return KNOWN_LOCALE_LABELS[locale] ?? locale.toUpperCase()
}

export function buildSlugRedirectsCollection(
  collections: CollectionEntry[],
  locales: string[],
  options?: SlugRedirectsCollectionOptions,
): CollectionConfig {
  const collectionSlug = options?.name ?? 'slug-redirects'
  const hidden = options?.visibleInTheUI === false

  const collectionOptions: OptionObject[] = collections.map(({ name }) => ({ label: toLabel(name), value: name }))
  const localeOptions: OptionObject[] = locales.map(locale => ({ label: toLocaleLabel(locale), value: locale }))

  return {
    slug: collectionSlug,
    access: {
      read: () => true,
      create: () => false,
      update: () => false,
      delete: () => true,
    },
    admin: {
      hidden,
      group: 'System',
      description: 'Automatic redirects created when document slugs change',
      defaultColumns: ['fromSlug', 'locale', 'collectionType', 'documentId', 'createdAt'],
    },
    fields: [
      { name: 'fromSlug', type: 'text', required: true, index: true },
      { name: 'locale', type: 'select', required: true, options: localeOptions },
      { name: 'collectionType', type: 'select', required: true, options: collectionOptions },
      { name: 'documentId', type: 'text', required: true },
    ],
  }
}
