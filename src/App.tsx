import { useMemo, useState } from 'react'
import { RepoDropZone } from '@/components/RepoDropZone'
import { SearchPreferences } from '@/components/SearchPreferences'
import { SkillProfile } from '@/components/SkillProfile'
import { JobResults } from '@/components/JobResults'
import { profileGithub, searchJobs } from '@/lib/api'
import { mergeLists } from '@shared/skills'
import type { JobListing, RepoProfile, WorkMode } from '@shared/types'

export default function App() {
  const [repos, setRepos] = useState<RepoProfile[]>([])
  const [workMode, setWorkMode] = useState<WorkMode>('remote')
  const [address, setAddress] = useState('')
  const [maxCommuteMiles, setMaxCommuteMiles] = useState(30)
  const [jobs, setJobs] = useState<JobListing[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [githubBusy, setGithubBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const skills = useMemo(() => mergeLists(...repos.map((repo) => repo.skills)), [repos])
  const languages = useMemo(
    () => mergeLists(...repos.map((repo) => repo.languages)),
    [repos],
  )

  function addRepos(incoming: RepoProfile[]) {
    setRepos((current) => {
      const next = [...current]
      for (const repo of incoming) {
        const index = next.findIndex((item) => item.name === repo.name)
        if (index >= 0) next[index] = repo
        else next.push(repo)
      }
      return next
    })
    setJobs(null)
  }

  async function addGithub(url: string) {
    setGithubBusy(true)
    try {
      const repo = await profileGithub(url)
      addRepos([repo])
    } finally {
      setGithubBusy(false)
    }
  }

  async function runSearch() {
    setSearching(true)
    setError(null)
    try {
      const results = await searchJobs({
        skills,
        languages,
        workMode,
        address,
        maxCommuteMiles,
      })
      setJobs(results)
    } catch (err) {
      setJobs(null)
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-900/10 bg-paper-100/80">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rust-600">
              Stackhunt
            </p>
            <h1 className="mt-1 font-serif text-4xl font-medium text-ink-950">
              Jobs for the work you already ship
            </h1>
            <p className="mt-2 max-w-xl text-sm text-ink-700">
              Drop in repos, pick remote or in person, and get ranked links from public
              boards. In-person listings include commute from your address.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-8 lg:grid-cols-2">
        <div className="space-y-4">
          <RepoDropZone onRepos={addRepos} onGithub={addGithub} busy={githubBusy} />
          <SkillProfile
            repos={repos}
            onRemove={(name) => setRepos((current) => current.filter((repo) => repo.name !== name))}
          />
        </div>
        <div className="space-y-4">
          <SearchPreferences
            workMode={workMode}
            address={address}
            maxCommuteMiles={maxCommuteMiles}
            canSearch={repos.length > 0}
            searching={searching}
            onWorkMode={setWorkMode}
            onAddress={setAddress}
            onMaxCommute={setMaxCommuteMiles}
            onSearch={runSearch}
          />
          <JobResults jobs={jobs} searching={searching} error={error} />
        </div>
      </main>
    </div>
  )
}
