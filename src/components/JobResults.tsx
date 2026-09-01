import { ArrowUpRight, Building2, Car, Globe, Loader2, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { JobListing } from '@shared/types'

type Props = {
  jobs: JobListing[] | null
  searching: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  onLoadMore: () => void
}

export function JobResults({
  jobs,
  searching,
  loadingMore,
  hasMore,
  error,
  onLoadMore,
}: Props) {
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

  if (error && !jobs?.length) {
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

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Matches</h2>
        <p className="font-mono text-sm text-muted-foreground">
          {jobs.length} listing{jobs.length === 1 ? '' : 's'}
        </p>
      </div>

      {error && jobs.length > 0 && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <ul className="space-y-3">
        {jobs.map((job, index) => (
          <li
            key={job.id}
            className="animate-fade-up"
            style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
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

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="lg"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="animate-spin" />
                Loading more…
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </section>
  )
}
