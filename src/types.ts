export interface OnChangeArgs {
  fromSlug: string
  toSlug: string
  collectionType: string
  locale: string
}

export interface CollectionEntry {
  name: string
  /**
   * Slug field name on the document. Overrides the plugin-level default (`'slug'`).
   * Auto-detects structure: object → Payload i18n, JSON string → blob, plain string → non-localized.
   */
  slugField?: string
  /** Fires when a slug change is detected and a redirect record is created for this collection. */
  onChange?: (args: OnChangeArgs) => void | Promise<void>
}

export interface SlugRedirectsCollectionOptions {
  /** Custom collection slug. Default: 'slug-redirects' */
  name?: string
  /** Show collection in PayloadCMS admin UI. Default: true */
  visibleInTheUI?: boolean
  /** Fires when any slug change is detected and a redirect record is created. */
  onChange?: (args: OnChangeArgs) => void | Promise<void>
}

export interface SlugRedirectsPluginOptions {
  /** Set to false to disable the plugin without removing it from config. Default: true. */
  enabled?: boolean
  /** Collections to watch. Accepts collection slugs or per-collection config objects. */
  collections: Array<string | CollectionEntry>
  /** Locale codes to track. Defaults to ['en']. */
  locales?: string[]
  /**
   * Slug field name on watched documents. Default: `'slug'`. Per-collection override via `CollectionEntry.slugField`.
   * Auto-detects structure: object → Payload i18n, JSON string → blob, plain string → non-localized.
   */
  slugField?: string
  /**
   * URL of the frontend revalidation endpoint. When set, the plugin calls this URL
   * with the old slug after a slug change so the cached page is invalidated immediately.
   * Only fires in NODE_ENV=production.
   */
  revalidateUrl?: string
  /** Custom headers sent with revalidation requests (e.g. authorization tokens). */
  revalidateHeaders?: Record<string, string>
  /** Options for the generated slug-redirects collection itself. */
  collection?: SlugRedirectsCollectionOptions
}
