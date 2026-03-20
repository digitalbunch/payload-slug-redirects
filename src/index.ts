import type { Config, Field, Plugin } from 'payload'
import { buildSlugRedirectsCollection } from './collection.js'
import { createRedirectOnSlugChange } from './hook.js'
import type { CollectionEntry, SlugRedirectsPluginOptions } from './types.js'

export const slugRedirectsPlugin = (options: SlugRedirectsPluginOptions) => {
  const {
    enabled = true,
    collections: rawCollections,
    locales = ['en'],
    slugField = locales.length > 1 ? 'localizedSlugs' : 'slug',
    revalidateUrl,
    revalidateHeaders,
    collection: collectionOptions,
  } = options

  return ((incomingConfig: Config): Config => {
    if (!enabled) return incomingConfig

    const collections: CollectionEntry[] = rawCollections.map((c) =>
      typeof c === 'string'
        ? { name: c, slugField }
        : { slugField, ...c }
    )

    const slugRedirectsCollection = buildSlugRedirectsCollection(collections, locales, collectionOptions)
    const redirectHook = createRedirectOnSlugChange(collections, locales, revalidateUrl, revalidateHeaders, collectionOptions)

    const collectionMap = new Map(collections.map((c) => [c.name, c]))
    const updatedCollections = (incomingConfig.collections ?? []).map((collection) => {
      const entry = collectionMap.get(collection.slug)
      if (!entry) return collection

      const fieldName = entry.slugField ?? 'slug'
      const existingFields: Field[] = collection.fields ?? []
      const hasField = existingFields.some((f) => 'name' in f && (f as { name?: string }).name === fieldName)
      const injectedField: Field = locales.length > 1
        ? { name: fieldName, type: 'json' }
        : { name: fieldName, type: 'text' }
      const fields = hasField ? existingFields : [...existingFields, injectedField]

      return {
        ...collection,
        fields,
        hooks: {
          ...collection.hooks,
          afterChange: [...(collection.hooks?.afterChange ?? []), redirectHook],
        },
      }
    })

    return {
      ...incomingConfig,
      collections: [...updatedCollections, slugRedirectsCollection],
    }
  }) satisfies Plugin
}

export { buildSlugRedirectsCollection } from './collection.js'
export { createRedirectOnSlugChange } from './hook.js'
export type { SlugRedirectsPluginOptions, CollectionEntry, OnChangeArgs, SlugRedirectsCollectionOptions } from './types.js'
