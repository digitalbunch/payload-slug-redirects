import { describe, expect, it } from 'vitest'
import { slugRedirectsPlugin } from '../index.js'

const baseConfig = {
  collections: [
    { slug: 'posts', fields: [], hooks: {} },
    { slug: 'pages', fields: [], hooks: {} },
  ],
}

describe('slugRedirectsPlugin', () => {
  it('appends the slug-redirects collection to the config', () => {
    const plugin = slugRedirectsPlugin({ collections: ['posts'] })
    const result = plugin(baseConfig as any)
    const slugs = result.collections!.map((c) => c.slug)
    expect(slugs).toContain('slug-redirects')
  })

  it('uses a custom collection name when provided', () => {
    const plugin = slugRedirectsPlugin({ collections: ['posts'], collection: { name: 'my-redirects' } })
    const result = plugin(baseConfig as any)
    const slugs = result.collections!.map((c) => c.slug)
    expect(slugs).toContain('my-redirects')
  })

  it('does not modify unwatched collections', () => {
    const plugin = slugRedirectsPlugin({ collections: ['posts'] })
    const result = plugin(baseConfig as any)
    const pages = result.collections!.find((c) => c.slug === 'pages')
    expect(pages?.hooks?.afterChange ?? []).toHaveLength(0)
  })

  it('injects afterChange hook into watched collections', () => {
    const plugin = slugRedirectsPlugin({ collections: ['posts'] })
    const result = plugin(baseConfig as any)
    const posts = result.collections!.find((c) => c.slug === 'posts')
    expect(posts?.hooks?.afterChange).toHaveLength(1)
  })

  it('preserves existing afterChange hooks on watched collections', () => {
    const existingHook = () => {}
    const config = {
      collections: [
        { slug: 'posts', fields: [], hooks: { afterChange: [existingHook] } },
      ],
    }
    const plugin = slugRedirectsPlugin({ collections: ['posts'] })
    const result = plugin(config as any)
    const posts = result.collections!.find((c) => c.slug === 'posts')
    expect(posts?.hooks?.afterChange).toHaveLength(2)
    expect(posts?.hooks?.afterChange).toContain(existingHook)
  })

  it('watches multiple collections and injects hooks into each', () => {
    const plugin = slugRedirectsPlugin({ collections: ['posts', 'pages'] })
    const result = plugin(baseConfig as any)
    const posts = result.collections!.find((c) => c.slug === 'posts')
    const pages = result.collections!.find((c) => c.slug === 'pages')
    expect(posts?.hooks?.afterChange).toHaveLength(1)
    expect(pages?.hooks?.afterChange).toHaveLength(1)
  })

  it('handles an incoming config with no collections', () => {
    const plugin = slugRedirectsPlugin({ collections: ['posts'] })
    const result = plugin({} as any)
    const slugs = result.collections!.map((c) => c.slug)
    expect(slugs).toContain('slug-redirects')
  })

  it('defaults locales to [en] when not provided', () => {
    // Verifiable indirectly — locale options on the appended collection
    const plugin = slugRedirectsPlugin({ collections: ['posts'] })
    const result = plugin(baseConfig as any)
    const redirectsCollection = result.collections!.find((c) => c.slug === 'slug-redirects')
    const localeField = (redirectsCollection!.fields as any[]).find((f) => f.name === 'locale')
    expect(localeField.options.map((o: any) => o.value)).toEqual(['en'])
  })

  it('injects a text slug field into a watched collection when single locale and field is missing', () => {
    const plugin = slugRedirectsPlugin({ collections: ['posts'] })
    const result = plugin(baseConfig as any)
    const posts = result.collections!.find((c) => c.slug === 'posts')
    const slugField = (posts!.fields as any[]).find((f) => f.name === 'slug')
    expect(slugField).toBeDefined()
    expect(slugField.type).toBe('text')
  })

  it('injects a json slug field into a watched collection when multiple locales and field is missing', () => {
    const plugin = slugRedirectsPlugin({ collections: ['posts'], locales: ['en', 'ar'], slugField: 'localizedSlugs' })
    const result = plugin(baseConfig as any)
    const posts = result.collections!.find((c) => c.slug === 'posts')
    const slugField = (posts!.fields as any[]).find((f) => f.name === 'localizedSlugs')
    expect(slugField).toBeDefined()
    expect(slugField.type).toBe('json')
  })

  it('does not inject slug field if it already exists on the collection', () => {
    const config = {
      collections: [
        { slug: 'posts', fields: [{ name: 'slug', type: 'text', required: true }], hooks: {} },
      ],
    }
    const plugin = slugRedirectsPlugin({ collections: ['posts'] })
    const result = plugin(config as any)
    const posts = result.collections!.find((c) => c.slug === 'posts')
    const slugFields = (posts!.fields as any[]).filter((f) => f.name === 'slug')
    expect(slugFields).toHaveLength(1)
  })

  it('defaults slugField to localizedSlugs when multiple locales are provided', () => {
    const plugin = slugRedirectsPlugin({ collections: ['posts'], locales: ['en', 'ar'] })
    const result = plugin(baseConfig as any)
    const posts = result.collections!.find((c) => c.slug === 'posts')
    const fields = posts!.fields as any[]
    expect(fields.find((f) => f.name === 'localizedSlugs')).toBeDefined()
    expect(fields.find((f) => f.name === 'slug')).toBeUndefined()
  })

  it('does not inject slug field into unwatched collections', () => {
    const plugin = slugRedirectsPlugin({ collections: ['posts'] })
    const result = plugin(baseConfig as any)
    const pages = result.collections!.find((c) => c.slug === 'pages')
    const slugField = (pages!.fields as any[]).find((f) => f.name === 'slug')
    expect(slugField).toBeUndefined()
  })

  it('returns the incoming config unchanged when enabled is false', () => {
    const plugin = slugRedirectsPlugin({ enabled: false, collections: ['posts'] })
    const result = plugin(baseConfig as any)
    expect(result).toBe(baseConfig)
  })

  it('does not mutate the incoming config', () => {
    const plugin = slugRedirectsPlugin({ collections: ['posts'] })
    const original = JSON.stringify(baseConfig)
    plugin(baseConfig as any)
    expect(JSON.stringify(baseConfig)).toBe(original)
  })
})
