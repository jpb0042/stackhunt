import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Building2, Car, Globe, MapPin, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { JobListing } from '@shared/types'

const PAGE_SIZE = 40

type Props = {
  jobs: JobListing[] | null
  searching: boolean
  error: string | null
}

export function JobResults({ jobs, searching, error }: Props) {
  const [query, setQuery] = useState('')
  const [board, setBoard] = useState('all')
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    setQuery('')
    setBoard('all')
    setVisible(PAGE_SIZE)
  }, [jobs])

  const boards = useMemo(() => {
    if (!jobs) return []
    return [...new Set(jobs.map((job) => job.board))].sort((a, b) => a.localeCompare(b))
  }, [jobs])

  const filtered = useMemo(() => {
    if (!jobs) return []
    const needle = query.trim().toLowerCase()
    return jobs.filter((job) => {
      if (board !== 'all' && job.board !== board) return false
      if (!needle) return true
      return [job.title, job.company, job.board].some((field) =>
        field.toLowerCase().includes(needle),
      )
    })
  }, [jobs, board, query])

  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [board, query])

  if (searching) {
    return (
      <section className="space-y-3">
        {[0, 1, 2].map((row) => (
          <Card key={row} className="p-6">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-3 h-4 w-1/3" />
            <div className="mt-5 flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </Card>
        ))}
      </section>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </Card>
    )
  }

  if (jobs === null) return null

  if (jobs.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="font-medium">No matches in range</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Try remote, a wider commute radius, or add another repo.
        </p>
      </Card>
    )
  }

  const shown = filtered.slice(0, visible)
  const remaining = Math.max(0, filtered.length - shown.length)

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Matches</h2>
          <p className="font-mono text-sm text-muted-foreground">
            {shown.length} of {filtered.length}
            {filtered.length !== jobs.length ? ` · ${jobs.length} total` : ''}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, company, board"
              className="pl-10"
            />
          </div>
          <select
            value={board}
            onChange={(event) => setBoard(event.target.value)}
            className={cn(
              'h-11 rounded-lg border border-input bg-secondary/40 px-3 text-sm shadow-sm',
              'focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25',
            )}
          >
            <option value="all">All boards</option>
            {boards.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-medium">No listings match that search</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Clear the filters or try a different board.
          </p>
        </Card>
      ) : (
        <>
          <ul className="space-y-3">
            {shown.map((job, index) => (
              <li
                key={job.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(index % PAGE_SIZE, 12) * 35}ms` }}
              >
                <Card className="group p-6 transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-balance text-lg font-semibold leading-snug tracking-tight">
                        {job.title}
                      </h3>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="size-3.5" />
                          {job.company}
                        </span>
                        <span className="text-border">·</span>
                        <span className="inline-flex items-center gap-1.5">
                          {job.remote ? (
                            <Globe className="size-3.5" />
                          ) : (
                            <MapPin className="size-3.5" />
                          )}
                          {job.location}
                        </span>
                      </p>
                    </div>

                    <Button
                      asChild
                      size="sm"
                      variant="secondary"
                      className="shrink-0 opacity-90 transition-opacity group-hover:opacity-100"
                    >
                      <a href={job.url} target="_blank" rel="noreferrer">
                        Open
                        <ArrowUpRight />
                      </a>
                    </Button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{job.board}</Badge>
                    {job.commuteLabel && (
                      <Badge variant={job.remote ? 'secondary' : 'default'}>
                        {!job.remote && <Car className="size-3" />}
                        {job.commuteLabel}
                      </Badge>
                    )}
                  </div>

                  {job.snippet && (
                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {job.snippet}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>

          {remaining > 0 && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="lg" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
                Load more
                <span className="font-mono text-muted-foreground">
                  {Math.min(PAGE_SIZE, remaining)}
                </span>
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
