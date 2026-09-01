import { useMemo, useState } from 'react'
import { JobResults } from '@/components/JobResults'
import { RepoDropZone } from '@/components/RepoDropZone'
import { SearchPreferences } from '@/components/SearchPreferences'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
      addRepos([await profileGithub(url)])
    } finally {
      setGithubBusy(false)
    }
  }

  async function runSearch() {
    setSearching(true)
    setError(null)
    try {
      setJobs(
        await searchJobs({ skills, languages, workMode, address, maxCommuteMiles }),
      )
    } catch (err) {
      setJobs(null)
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="glow-backdrop grid-backdrop relative min-h-screen">
      <div
        aria-hidden
        className="relative z-10 w-full overflow-hidden select-none px-2 pt-3 sm:pt-4"
      >
        <p className="w-full text-center font-extrabold uppercase leading-none tracking-[0.06em] text-primary/20 text-[clamp(2.75rem,14vw,11rem)]">
          STACKHUNT
        </p>
      </div>
      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-28 pt-8 sm:pt-10">
        <header className="text-center">
          <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Jobs for the work
            <br />
            <span className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
              you already ship
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            Drop in your repos and Stackhunt reads the stack you actually work in, then
            pulls matching roles from public job boards with commute times included.
          </p>
        </header>

        <Card className="mt-12">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <RepoDropZone
              repos={repos}
              onRepos={addRepos}
              onGithub={addGithub}
              onRemove={(name) =>
                setRepos((current) => current.filter((repo) => repo.name !== name))
              }
              busy={githubBusy}
            />
            <Separator className="bg-border/60" />
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
          </CardContent>
        </Card>

        {(searching || error || jobs) && (
          <div className="mt-10">
            <JobResults jobs={jobs} searching={searching} error={error} />
          </div>
        )}
      </main>
    </div>
  )
}
