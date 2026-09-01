import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { HeroCopy } from '@/components/HeroCopy'
import { JobResults } from '@/components/JobResults'
import { RepoDropZone } from '@/components/RepoDropZone'
import { SearchPreferences } from '@/components/SearchPreferences'
import { Wordmark } from '@/components/Wordmark'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { profileGithub, searchJobs } from '@/lib/api'
import { INTRO } from '@/lib/intro'
import { loadSavedRepos, saveRepos } from '@/lib/storage'
import { mergeLists } from '@shared/skills'
import type { JobListing, RepoProfile, WorkMode } from '@shared/types'

gsap.registerPlugin(useGSAP)

export default function App() {
  const [repos, setRepos] = useState<RepoProfile[]>(loadSavedRepos)
  const [workMode, setWorkMode] = useState<WorkMode>('remote')
  const [address, setAddress] = useState('')
  const [maxCommuteMiles, setMaxCommuteMiles] = useState(30)
  const [jobs, setJobs] = useState<JobListing[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [searching, setSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [githubBusy, setGithubBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchToken, setSearchToken] = useState(0)
  const dropCard = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const card = dropCard.current
    if (!card) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(card, { opacity: 1, y: 0 })
      return
    }
    gsap.fromTo(
      card,
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: INTRO.cardDelay,
        ease: 'power3.out',
      },
    )
  })

  useEffect(() => {
    saveRepos(repos)
  }, [repos])

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
    setHasMore(false)
    setPage(1)
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
    setPage(1)
    try {
      const result = await searchJobs({
        skills,
        languages,
        workMode,
        address,
        maxCommuteMiles,
        page: 1,
      })
      setJobs(result.jobs)
      setHasMore(result.hasMore)
      setSearchToken((token) => token + 1)
    } catch (err) {
      setJobs(null)
      setHasMore(false)
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setError(null)
    try {
      const nextPage = page + 1
      const result = await searchJobs({
        skills,
        languages,
        workMode,
        address,
        maxCommuteMiles,
        page: nextPage,
      })
      setJobs((current) => {
        const seen = new Set((current ?? []).map((job) => job.id))
        return [...(current ?? []), ...result.jobs.filter((job) => !seen.has(job.id))]
      })
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more jobs')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="glow-backdrop grid-backdrop relative min-h-screen">
      <Wordmark />
      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-28 pt-8 sm:pt-10">
        <HeroCopy />

        <Card ref={dropCard} className="intro-card mt-12">
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
            <JobResults
              jobs={jobs}
              searching={searching}
              loadingMore={loadingMore}
              hasMore={hasMore}
              error={error}
              resetToken={searchToken}
              onLoadMore={loadMore}
            />
          </div>
        )}
      </main>
    </div>
  )
}
