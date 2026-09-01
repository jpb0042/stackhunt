import type { RepoProfile } from '@shared/types'

const REPOS_KEY = 'stackhunt.repos.v1'

export function loadSavedRepos(): RepoProfile[] {
  try {
    const raw = localStorage.getItem(REPOS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isRepoProfile)
  } catch {
    return []
  }
}

export function saveRepos(repos: RepoProfile[]): void {
  try {
    localStorage.setItem(REPOS_KEY, JSON.stringify(repos))
  } catch {
    // Quota or private mode — search still works for this session.
  }
}

function isRepoProfile(value: unknown): value is RepoProfile {
  if (!value || typeof value !== 'object') return false
  const repo = value as RepoProfile
  return (
    typeof repo.name === 'string' &&
    (repo.source === 'folder' || repo.source === 'github') &&
    Array.isArray(repo.skills) &&
    Array.isArray(repo.languages)
  )
}
