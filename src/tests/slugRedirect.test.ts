import { describe, expect, it, vi, afterEach } from 'vitest'

vi.mock('next/navigation', () => ({
  permanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

import { SlugRedirect } from '../next/app/index.js'
import { permanentRedirect, notFound } from 'next/navigation'

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
  vi.clearAllMocks()
})

describe('SlugRedirect', () => {
  const baseProps = {
    slug: 'old-slug',
    collectionType: 'posts',
    locale: 'en',
    cmsUrl: 'https://cms.example.com',
  }

  it('calls permanentRedirect with the default URL when a redirect exists', async () => {
    mockFetch(
      { ok: true, json: { docs: [{ documentId: 42 }], totalDocs: 1 } },
      { ok: true, json: { slug: 'new-slug' } },
    )
    await expect(SlugRedirect(baseProps)).rejects.toThrow('NEXT_REDIRECT:/en/posts/new-slug')
    expect(permanentRedirect).toHaveBeenCalledWith('/en/posts/new-slug')
  })

  it('calls permanentRedirect with a custom buildUrl', async () => {
    mockFetch(
      { ok: true, json: { docs: [{ documentId: 42 }], totalDocs: 1 } },
      { ok: true, json: { slug: 'new-slug' } },
    )
    const buildUrl = (s: string, l: string, ct: string) => `/custom/${l}/${ct}/${s}`
    await expect(SlugRedirect({ ...baseProps, buildUrl })).rejects.toThrow('NEXT_REDIRECT:/custom/en/posts/new-slug')
    expect(permanentRedirect).toHaveBeenCalledWith('/custom/en/posts/new-slug')
  })

  it('calls notFound when no redirect exists', async () => {
    mockFetch({ ok: true, json: { docs: [], totalDocs: 0 } })
    await expect(SlugRedirect(baseProps)).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })

  it('calls notFound when the redirect API fails', async () => {
    mockFetch({ ok: false })
    await expect(SlugRedirect(baseProps)).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })

  it('passes custom redirectsCollection and slugField to fetchCurrentSlug', async () => {
    const fetchMock = mockFetch(
      { ok: true, json: { docs: [{ documentId: 1 }], totalDocs: 1 } },
      { ok: true, json: { customField: 'new-slug' } },
    )
    await expect(
      SlugRedirect({ ...baseProps, redirectsCollection: 'my-redirects', slugField: 'customField' }),
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(fetchMock.mock.calls[0][0]).toContain('/api/my-redirects')
  })

  it('passes fallbackLocale to fetchCurrentSlug', async () => {
    const fetchMock = mockFetch(
      { ok: true, json: { docs: [{ documentId: 1 }], totalDocs: 1 } },
      { ok: true, json: { slug: 'new-slug' } },
    )
    await expect(
      SlugRedirect({ ...baseProps, fallbackLocale: 'ar' }),
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(fetchMock.mock.calls[1][0]).toContain('fallbackLocale=ar')
  })
})
