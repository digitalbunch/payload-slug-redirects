import { describe, expect, it } from 'vitest'
import { extractSlugs } from '../hook.js'

const LOCALES = ['en', 'ar']

describe('extractSlugs', () => {
  describe('JSON blob field', () => {
    it('parses a JSON blob and returns per-locale slugs', () => {
      const record = { localizedSlugs: '{"en":"english-slug","ar":"arabic-slug"}' }
      expect(extractSlugs(record, 'localizedSlugs', LOCALES)).toEqual({
        en: 'english-slug',
        ar: 'arabic-slug',
      })
    })

    it('returns partial locales if JSON only has some', () => {
      const record = { localizedSlugs: '{"en":"english-slug"}' }
      expect(extractSlugs(record, 'localizedSlugs', LOCALES)).toEqual({ en: 'english-slug' })
    })
  })

  describe('plain string field (non-localized)', () => {
    it('applies the same slug to all tracked locales', () => {
      const record = { slug: 'my-slug' }
      expect(extractSlugs(record, 'slug', LOCALES)).toEqual({
        en: 'my-slug',
        ar: 'my-slug',
      })
    })

    it('handles invalid JSON string as plain string', () => {
      const record = { slug: 'not-{json' }
      expect(extractSlugs(record, 'slug', LOCALES)).toEqual({
        en: 'not-{json',
        ar: 'not-{json',
      })
    })
  })

  describe('plain object (Payload i18n object form)', () => {
    it('returns the object as-is when field is a plain object', () => {
      // NOTE: In practice, Payload returns plain strings (not objects) for localized: true
      // fields in afterChange hook context. This path only triggers when a save is performed
      // without locale context (uncommon). Use a JSON blob field for reliable multi-locale support.
      const record = { slug: { en: 'english-slug', ar: 'arabic-slug' } }
      expect(extractSlugs(record, 'slug', LOCALES)).toEqual({
        en: 'english-slug',
        ar: 'arabic-slug',
      })
    })

    it('returns empty object when field is an array', () => {
      const record = { slug: ['en', 'ar'] }
      expect(extractSlugs(record, 'slug', LOCALES)).toEqual({})
    })
  })

  describe('edge cases', () => {
    it('returns empty object for an empty JSON object blob', () => {
      const record = { localizedSlugs: '{}' }
      expect(extractSlugs(record, 'localizedSlugs', LOCALES)).toEqual({})
    })

    it('returns all keys from JSON blob regardless of tracked locales', () => {
      // extractSlugs returns the full parsed object — the hook filters by locale in its loop
      const record = { localizedSlugs: '{"en":"en-slug","fr":"fr-slug"}' }
      const result = extractSlugs(record, 'localizedSlugs', LOCALES)
      expect(result['en']).toBe('en-slug')
      expect(result['fr']).toBe('fr-slug')
    })
  })

  describe('missing or empty field', () => {
    it('returns empty object when field is missing', () => {
      const record = {}
      expect(extractSlugs(record, 'slug', LOCALES)).toEqual({})
    })

    it('returns empty object when field is null', () => {
      const record = { slug: null }
      expect(extractSlugs(record, 'slug', LOCALES)).toEqual({})
    })

    it('returns empty object when field is empty string', () => {
      const record = { slug: '' }
      expect(extractSlugs(record, 'slug', LOCALES)).toEqual({})
    })
  })
})
