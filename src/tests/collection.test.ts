import { describe, expect, it } from 'vitest'
import { buildSlugRedirectsCollection } from '../collection.js'
import type { CollectionEntry } from '../types.js'

const COLLECTIONS: CollectionEntry[] = [
  { name: 'posts' },
  { name: 'case-studies' },
]
const LOCALES = ['en', 'ar']

describe('buildSlugRedirectsCollection', () => {
  it('uses slug-redirects as the default collection slug', () => {
    const config = buildSlugRedirectsCollection(COLLECTIONS, LOCALES)
    expect(config.slug).toBe('slug-redirects')
  })

  it('uses a custom name when provided', () => {
    const config = buildSlugRedirectsCollection(COLLECTIONS, LOCALES, { name: 'my-redirects' })
    expect(config.slug).toBe('my-redirects')
  })

  it('is visible in the UI by default', () => {
    const config = buildSlugRedirectsCollection(COLLECTIONS, LOCALES)
    expect((config.admin as any).hidden).toBe(false)
  })

  it('is hidden when visibleInTheUI is false', () => {
    const config = buildSlugRedirectsCollection(COLLECTIONS, LOCALES, { visibleInTheUI: false })
    expect((config.admin as any).hidden).toBe(true)
  })

  it('has public read access', () => {
    const config = buildSlugRedirectsCollection(COLLECTIONS, LOCALES)
    expect((config.access as any).read()).toBe(true)
  })

  it('blocks direct create and update access but allows delete', () => {
    const config = buildSlugRedirectsCollection(COLLECTIONS, LOCALES)
    expect((config.access as any).create()).toBe(false)
    expect((config.access as any).update()).toBe(false)
    expect((config.access as any).delete()).toBe(true)
  })

  it('includes fromSlug, locale, collectionType, documentId fields', () => {
    const config = buildSlugRedirectsCollection(COLLECTIONS, LOCALES)
    const fieldNames = (config.fields as any[]).map((f) => f.name)
    expect(fieldNames).toContain('fromSlug')
    expect(fieldNames).toContain('locale')
    expect(fieldNames).toContain('collectionType')
    expect(fieldNames).toContain('documentId')
  })

  it('includes all provided collections as collectionType options', () => {
    const config = buildSlugRedirectsCollection(COLLECTIONS, LOCALES)
    const field = (config.fields as any[]).find((f) => f.name === 'collectionType')
    const values = field.options.map((o: any) => o.value)
    expect(values).toContain('posts')
    expect(values).toContain('case-studies')
  })

  it('includes all provided locales as locale options', () => {
    const config = buildSlugRedirectsCollection(COLLECTIONS, LOCALES)
    const field = (config.fields as any[]).find((f) => f.name === 'locale')
    const values = field.options.map((o: any) => o.value)
    expect(values).toContain('en')
    expect(values).toContain('ar')
  })

  it('generates a human-readable label for hyphenated collection names', () => {
    const config = buildSlugRedirectsCollection([{ name: 'case-studies' }], LOCALES)
    const field = (config.fields as any[]).find((f) => f.name === 'collectionType')
    const option = field.options.find((o: any) => o.value === 'case-studies')
    expect(option.label).toBe('Case Studies')
  })

  it('maps known locale codes to their full language names', () => {
    const config = buildSlugRedirectsCollection(COLLECTIONS, ['en', 'ar', 'fr', 'de', 'es'])
    const field = (config.fields as any[]).find((f) => f.name === 'locale')
    const labels = Object.fromEntries(field.options.map((o: any) => [o.value, o.label]))
    expect(labels['en']).toBe('English')
    expect(labels['ar']).toBe('Arabic')
    expect(labels['fr']).toBe('French')
    expect(labels['de']).toBe('German')
    expect(labels['es']).toBe('Spanish')
  })

  it('uppercases unknown locale codes as labels', () => {
    const config = buildSlugRedirectsCollection(COLLECTIONS, ['zh'])
    const field = (config.fields as any[]).find((f) => f.name === 'locale')
    expect(field.options[0].label).toBe('ZH')
  })

  it('indexes fromSlug field', () => {
    const config = buildSlugRedirectsCollection(COLLECTIONS, LOCALES)
    const field = (config.fields as any[]).find((f) => f.name === 'fromSlug')
    expect(field.index).toBe(true)
  })

  it('stores documentId as text to support both SQL and MongoDB IDs', () => {
    const config = buildSlugRedirectsCollection(COLLECTIONS, LOCALES)
    const field = (config.fields as any[]).find((f) => f.name === 'documentId')
    expect(field.type).toBe('text')
  })
})
