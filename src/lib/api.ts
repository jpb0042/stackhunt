import type { JobListing, RepoProfile, SearchRequest } from '@shared/types'

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error || res.statusText
  } catch {
    return res.statusText
  }
}

export async function searchJobs(request: SearchRequest): Promise<JobListing[]> {
  const res = await fetch('/api/jobs/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { jobs: JobListing[] }
  return body.jobs
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
