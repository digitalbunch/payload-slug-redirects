import { describe, expect, it, vi, afterEach } from 'vitest'
import { createSlugRedirectHandler } from '../next/index.js'
import { resolveSlugRedirect } from '../next/pages/index.js'

function makeFetchMock(responses: Array<{ ok: boolean; json?: object }>) {
  let call = 0
  return vi.fn().mockImplementation(() => {
    const r = responses[call++] ?? { ok: false }
    return Promise.resolve({
      ok: r.ok,
      json: () => Promise.resolve(r.json ?? {}),
    })
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// createSlugRedirectHandler
// ---------------------------------------------------------------------------

describe('createSlugRedirectHandler', () => {
  function makeRes() {
    const res = {
      statusCode: 200,
      body: null as unknown,
      status(code: number) {
        this.statusCode = code
        return { json: (body: unknown) => { res.body = body } }
      },
      json(body: unknown) {
        this.body = body
      },
    }
    return res
  }

  it('returns 400 when fromSlug is missing', async () => {
    const handler = createSlugRedirectHandler({ cmsUrl: 'https://cms.example.com' })
    const res = makeRes()
    await handler({ query: { locale: 'en', collectionType: 'posts' } }, res as any)
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when locale is missing', async () => {
    const handler = createSlugRedirectHandler({ cmsUrl: 'https://cms.example.com' })
    const res = makeRes()
    await handler({ query: { fromSlug: 'old-slug', collectionType: 'posts' } }, res as any)
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when collectionType is missing', async () => {
    const handler = createSlugRedirectHandler({ cmsUrl: 'https://cms.example.com' })
    const res = makeRes()
    await handler({ query: { fromSlug: 'old-slug', locale: 'en' } }, res as any)
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when no redirect record exists', async () => {
    const fetchMock = makeFetchMock([{ ok: true, json: { docs: [], totalDocs: 0 } }])
    vi.stubGlobal('fetch', fetchMock)

    const handler = createSlugRedirectHandler({ cmsUrl: 'https://cms.example.com' })
    const res = makeRes()
    await handler({ query: { fromSlug: 'old-slug', locale: 'en', collectionType: 'posts' } }, res as any)
    expect(res.statusCode).toBe(404)
  })

  it('returns the new slug on success', async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: { docs: [{ documentId: 42 }], totalDocs: 1 } },
      { ok: true, json: { slug: 'new-slug' } },
    ])
    vi.stubGlobal('fetch', fetchMock)

    const handler = createSlugRedirectHandler({ cmsUrl: 'https://cms.example.com' })
    const res = makeRes()
    await handler({ query: { fromSlug: 'old-slug', locale: 'en', collectionType: 'posts' } }, res as any)
    expect((res.body as any).slug).toBe('new-slug')
  })

  it('uses custom redirectsCollection when configured', async () => {
    const fetchMock = makeFetchMock([{ ok: true, json: { docs: [], totalDocs: 0 } }])
    vi.stubGlobal('fetch', fetchMock)

    const handler = createSlugRedirectHandler({
      cmsUrl: 'https://cms.example.com',
      redirectsCollection: 'custom-redirects',
    })
    const res = makeRes()
    await handler({ query: { fromSlug: 'old-slug', locale: 'en', collectionType: 'posts' } }, res as any)

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('custom-redirects'))
  })

  it('handles array query params (takes first value)', async () => {
    const fetchMock = makeFetchMock([{ ok: true, json: { docs: [], totalDocs: 0 } }])
    vi.stubGlobal('fetch', fetchMock)

    const handler = createSlugRedirectHandler({ cmsUrl: 'https://cms.example.com' })
    const res = makeRes()
    await handler(
      { query: { fromSlug: ['old-slug', 'other'], locale: ['en'], collectionType: ['posts'] } },
      res as any,
    )
    expect(res.statusCode).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// resolveSlugRedirect
// ---------------------------------------------------------------------------

describe('resolveSlugRedirect', () => {
  it('returns null when no redirect record exists', async () => {
    const fetchMock = makeFetchMock([{ ok: true, json: { docs: [], totalDocs: 0 } }])
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveSlugRedirect({
      fromSlug: 'old-slug',
      locale: 'en',
      collectionType: 'posts',
      cmsUrl: 'https://cms.example.com',
    })
    expect(result).toBeNull()
  })

  it('returns a permanent redirect object when a redirect exists', async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: { docs: [{ documentId: 1 }], totalDocs: 1 } },
      { ok: true, json: { slug: 'new-slug' } },
    ])
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveSlugRedirect({
      fromSlug: 'old-slug',
      locale: 'en',
      collectionType: 'posts',
      cmsUrl: 'https://cms.example.com',
    })
    expect(result).toEqual({
      redirect: { destination: '/en/posts/new-slug', permanent: true },
    })
  })

  it('uses buildUrl when provided', async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: { docs: [{ documentId: 1 }], totalDocs: 1 } },
      { ok: true, json: { slug: 'new-slug' } },
    ])
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveSlugRedirect({
      fromSlug: 'old-slug',
      locale: 'ar',
      collectionType: 'posts',
      cmsUrl: 'https://cms.example.com',
      buildUrl: (slug, locale) => `/custom/${locale}/${slug}`,
    })
    expect(result?.redirect.destination).toBe('/custom/ar/new-slug')
  })

  it('uses default destination URL without buildUrl', async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: { docs: [{ documentId: 1 }], totalDocs: 1 } },
      { ok: true, json: { slug: 'new-slug' } },
    ])
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveSlugRedirect({
      fromSlug: 'old-slug',
      locale: 'en',
      collectionType: 'case-studies',
      cmsUrl: 'https://cms.example.com',
    })
    expect(result?.redirect.destination).toBe('/en/case-studies/new-slug')
    expect(result?.redirect.permanent).toBe(true)
  })
})
