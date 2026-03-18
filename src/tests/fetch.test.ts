import { describe, expect, it, vi, afterEach } from 'vitest'
import { fetchCurrentSlug } from '../next/_fetch.js'

const BASE_OPTIONS = {
  fromSlug: 'old-slug',
  locale: 'en',
  collectionType: 'posts',
  cmsUrl: 'https://cms.example.com',
}

function mockFetch(...responses: Array<{ ok: boolean; json?: object }>) {
  const fetchMock = vi.fn()
  for (const res of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: res.ok,
      json: () => Promise.resolve(res.json ?? {}),
    })
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchCurrentSlug', () => {
  it('returns the current slug when a redirect record and document exist', async () => {
    mockFetch(
      { ok: true, json: { docs: [{ documentId: 42 }], totalDocs: 1 } },
      { ok: true, json: { slug: 'new-slug' } },
    )
    const result = await fetchCurrentSlug(BASE_OPTIONS)
    expect(result).toBe('new-slug')
  })

  it('returns null when no redirect record exists', async () => {
    mockFetch({ ok: true, json: { docs: [], totalDocs: 0 } })
    const result = await fetchCurrentSlug(BASE_OPTIONS)
    expect(result).toBeNull()
  })

  it('returns null when the redirect API call fails', async () => {
    mockFetch({ ok: false })
    const result = await fetchCurrentSlug(BASE_OPTIONS)
    expect(result).toBeNull()
  })

  it('returns null when the document API call fails', async () => {
    mockFetch(
      { ok: true, json: { docs: [{ documentId: 42 }], totalDocs: 1 } },
      { ok: false },
    )
    const result = await fetchCurrentSlug(BASE_OPTIONS)
    expect(result).toBeNull()
  })

  it('returns null when the document has no slug field', async () => {
    mockFetch(
      { ok: true, json: { docs: [{ documentId: 42 }], totalDocs: 1 } },
      { ok: true, json: {} },
    )
    const result = await fetchCurrentSlug(BASE_OPTIONS)
    expect(result).toBeNull()
  })

  it('strips trailing slash from cmsUrl', async () => {
    const fetchMock = mockFetch(
      { ok: true, json: { docs: [{ documentId: 42 }], totalDocs: 1 } },
      { ok: true, json: { slug: 'new-slug' } },
    )
    await fetchCurrentSlug({ ...BASE_OPTIONS, cmsUrl: 'https://cms.example.com/' })
    expect(fetchMock.mock.calls[0][0]).toMatch(/^https:\/\/cms\.example\.com\/api\//)
    expect(fetchMock.mock.calls[0][0]).not.toMatch(/\/\/api\//)
  })

  it('uses the default slug-redirects collection', async () => {
    const fetchMock = mockFetch(
      { ok: true, json: { docs: [{ documentId: 42 }], totalDocs: 1 } },
      { ok: true, json: { slug: 'new-slug' } },
    )
    await fetchCurrentSlug(BASE_OPTIONS)
    expect(fetchMock.mock.calls[0][0]).toContain('/api/slug-redirects')
  })

  it('uses a custom redirectsCollection name', async () => {
    const fetchMock = mockFetch(
      { ok: true, json: { docs: [{ documentId: 42 }], totalDocs: 1 } },
      { ok: true, json: { slug: 'new-slug' } },
    )
    await fetchCurrentSlug({ ...BASE_OPTIONS, redirectsCollection: 'my-redirects' })
    expect(fetchMock.mock.calls[0][0]).toContain('/api/my-redirects')
  })

  it('queries the redirect endpoint with correct params', async () => {
    const fetchMock = mockFetch(
      { ok: true, json: { docs: [{ documentId: 42 }], totalDocs: 1 } },
      { ok: true, json: { slug: 'new-slug' } },
    )
    await fetchCurrentSlug(BASE_OPTIONS)
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('where%5BfromSlug%5D%5Bequals%5D=old-slug')
    expect(url).toContain('where%5Blocale%5D%5Bequals%5D=en')
    expect(url).toContain('where%5BcollectionType%5D%5Bequals%5D=posts')
    expect(url).toContain('sort=-createdAt')
    expect(url).toContain('limit=1')
  })

  it('fetches the document by its ID from the correct collection', async () => {
    const fetchMock = mockFetch(
      { ok: true, json: { docs: [{ documentId: 99 }], totalDocs: 1 } },
      { ok: true, json: { slug: 'new-slug' } },
    )
    await fetchCurrentSlug(BASE_OPTIONS)
    expect(fetchMock.mock.calls[1][0]).toContain('/api/posts/99')
  })
})
