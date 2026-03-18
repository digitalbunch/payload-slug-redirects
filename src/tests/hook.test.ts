import { describe, expect, it, vi, afterEach } from 'vitest'
import { createRedirectOnSlugChange } from '../hook.js'
import type { CollectionEntry } from '../types.js'

const COLLECTIONS: CollectionEntry[] = [
  { name: 'posts', slugField: 'localizedSlugs' },
]
const LOCALES = ['en', 'ar']

function makeReq() {
  return {
    payload: {
      create: vi.fn().mockResolvedValue({}),
      logger: {
        info: vi.fn(),
        error: vi.fn(),
      },
    },
  }
}

function makeHookArgs(overrides: Record<string, unknown> = {}) {
  return {
    operation: 'update',
    collection: { slug: 'posts' },
    req: makeReq(),
    doc: { id: 1, localizedSlugs: '{"en":"new-slug","ar":"new-ar"}' },
    previousDoc: { id: 1, localizedSlugs: '{"en":"old-slug","ar":"old-ar"}' },
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('createRedirectOnSlugChange', () => {
  it('does nothing on create operation', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES)
    const args = makeHookArgs({ operation: 'create', previousDoc: null })
    const result = await hook(args as any)
    expect(result).toBe(args.doc)
    expect(args.req.payload.create).not.toHaveBeenCalled()
  })

  it('does nothing when previousDoc is missing', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES)
    const args = makeHookArgs({ previousDoc: null })
    const result = await hook(args as any)
    expect(result).toBe(args.doc)
    expect(args.req.payload.create).not.toHaveBeenCalled()
  })

  it('does nothing when document is a draft', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES)
    const args = makeHookArgs({ doc: { id: 1, _status: 'draft', localizedSlugs: '{"en":"new-slug"}' } })
    const result = await hook(args as any)
    expect(result).toBe(args.doc)
    expect(args.req.payload.create).not.toHaveBeenCalled()
  })

  it('does nothing when slug has not changed', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES)
    const args = makeHookArgs({
      doc: { id: 1, localizedSlugs: '{"en":"same-slug","ar":"same-ar"}' },
      previousDoc: { id: 1, localizedSlugs: '{"en":"same-slug","ar":"same-ar"}' },
    })
    await hook(args as any)
    expect(args.req.payload.create).not.toHaveBeenCalled()
  })

  it('creates a redirect record when slug changes', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES)
    const args = makeHookArgs()
    await hook(args as any)
    expect(args.req.payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'slug-redirects',
        data: expect.objectContaining({ fromSlug: 'old-slug', locale: 'en', collectionType: 'posts', documentId: 1 }),
      })
    )
  })

  it('creates redirect records for each locale that changed', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES)
    const args = makeHookArgs()
    await hook(args as any)
    expect(args.req.payload.create).toHaveBeenCalledTimes(2)
    const calls = (args.req.payload.create as ReturnType<typeof vi.fn>).mock.calls
    const locales = calls.map((c: any) => c[0].data.locale)
    expect(locales).toContain('en')
    expect(locales).toContain('ar')
  })

  it('only creates a redirect for the locale whose slug changed', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES)
    const args = makeHookArgs({
      doc: { id: 1, localizedSlugs: '{"en":"new-slug","ar":"same-ar"}' },
      previousDoc: { id: 1, localizedSlugs: '{"en":"old-slug","ar":"same-ar"}' },
    })
    await hook(args as any)
    expect(args.req.payload.create).toHaveBeenCalledTimes(1)
    expect(args.req.payload.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ locale: 'en' }) })
    )
  })

  it('calls entry onChange when slug changes', async () => {
    const onChange = vi.fn()
    const collections: CollectionEntry[] = [{ name: 'posts', slugField: 'localizedSlugs', onChange }]
    const hook = createRedirectOnSlugChange(collections, LOCALES)
    const args = makeHookArgs()
    await hook(args as any)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ fromSlug: 'old-slug', toSlug: 'new-slug', locale: 'en' })
    )
  })

  it('calls collectionOptions onChange with correct args when slug changes', async () => {
    const onChange = vi.fn()
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES, undefined, { onChange })
    const args = makeHookArgs()
    await hook(args as any)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ fromSlug: 'old-slug', toSlug: 'new-slug', collectionType: 'posts', locale: 'en' })
    )
  })

  it('does not throw when payload.create fails — logs error instead', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES)
    const args = makeHookArgs()
    args.req.payload.create.mockRejectedValue(new Error('db error'))
    await expect(hook(args as any)).resolves.toBeDefined()
    expect(args.req.payload.logger.error).toHaveBeenCalled()
  })

  it('processes a published document (_status: published)', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES)
    const args = makeHookArgs({ doc: { id: 1, _status: 'published', localizedSlugs: '{"en":"new-slug","ar":"new-ar"}' } })
    await hook(args as any)
    expect(args.req.payload.create).toHaveBeenCalled()
  })

  it('processes a document with no _status (no draft system)', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES)
    const args = makeHookArgs({ doc: { id: 1, localizedSlugs: '{"en":"new-slug","ar":"new-ar"}' } })
    await hook(args as any)
    expect(args.req.payload.create).toHaveBeenCalled()
  })

  it('skips when the collection is not in the watched list', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES)
    const args = makeHookArgs({ collection: { slug: 'untracked-collection' } })
    const result = await hook(args as any)
    expect(result).toBe(args.doc)
    expect(args.req.payload.create).not.toHaveBeenCalled()
  })

  it('skips a locale when the previous slug is missing', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES)
    const args = makeHookArgs({
      doc: { id: 1, localizedSlugs: '{"en":"new-slug","ar":"new-ar"}' },
      previousDoc: { id: 1, localizedSlugs: '{"en":"old-slug"}' },
    })
    await hook(args as any)
    expect(args.req.payload.create).toHaveBeenCalledTimes(1)
    expect(args.req.payload.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ locale: 'en' }) })
    )
  })

  it('skips a locale when the new slug is missing', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES)
    const args = makeHookArgs({
      doc: { id: 1, localizedSlugs: '{"en":"new-slug"}' },
      previousDoc: { id: 1, localizedSlugs: '{"en":"old-slug","ar":"old-ar"}' },
    })
    await hook(args as any)
    expect(args.req.payload.create).toHaveBeenCalledTimes(1)
    expect(args.req.payload.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ locale: 'en' }) })
    )
  })

  it('falls back to default slugField when entry has none — creates one redirect per locale', async () => {
    // Plain string slug is applied to all locales, so both locales see a change
    const collections: CollectionEntry[] = [{ name: 'posts' }]
    const hook = createRedirectOnSlugChange(collections, LOCALES)
    const args = makeHookArgs({
      doc: { id: 1, slug: 'new-slug' },
      previousDoc: { id: 1, slug: 'old-slug' },
    })
    await hook(args as any)
    expect(args.req.payload.create).toHaveBeenCalledTimes(2)
    expect(args.req.payload.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ fromSlug: 'old-slug' }) })
    )
  })

  it('calls revalidateUrl once per changed locale in production', async () => {
    const fetchMock = vi.fn().mockResolvedValue({})
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('NODE_ENV', 'production')

    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES, 'https://mysite.com/api/revalidate')
    const args = makeHookArgs()
    await hook(args as any)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('https://mysite.com/api/revalidate'))
  })

  it('does not call revalidateUrl outside production', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES, 'https://mysite.com/api/revalidate')
    const args = makeHookArgs()
    await hook(args as any)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the custom collection slug when configured', async () => {
    const hook = createRedirectOnSlugChange(COLLECTIONS, LOCALES, undefined, { name: 'custom-redirects' })
    const args = makeHookArgs()
    await hook(args as any)
    expect(args.req.payload.create).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'custom-redirects' })
    )
  })
})
