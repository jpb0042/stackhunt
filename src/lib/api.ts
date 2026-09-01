import type { PlaceSuggestion, RepoProfile, SearchPage, SearchRequest } from '@shared/types'

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error || res.statusText
  } catch {
    return res.statusText
  }
}

export async function searchJobs(request: SearchRequest): Promise<SearchPage> {
  const res = await fetch('/api/jobs/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<SearchPage>
}

export async function profileGithub(url: string): Promise<RepoProfile> {
  const res = await fetch('/api/github/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { repo: RepoProfile }
  return body.repo
}

export async function suggestPlaces(
  query: string,
  signal?: AbortSignal,
  session?: string,
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ q: query })
  if (session) params.set('session', session)
  const res = await fetch(`/api/places/suggest?${params}`, { signal })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { places: PlaceSuggestion[] }
  return body.places
}

export async function resolvePlace(
  placeId: string,
  session?: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion> {
  const params = new URLSearchParams({ id: placeId })
  if (session) params.set('session', session)
  const res = await fetch(`/api/places/details?${params}`, { signal })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { place: PlaceSuggestion }
  return body.place
}
