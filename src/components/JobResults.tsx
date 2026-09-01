import type { JobListing } from '@shared/types'

type Props = {
  jobs: JobListing[] | null
  searching: boolean
  error: string | null
}

export function JobResults({ jobs, searching, error }: Props) {
  return (
    <section className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-card">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-serif text-2xl font-medium text-ink-950">Jobs</h2>
        {jobs && (
          <p className="text-sm text-ink-700">
            {jobs.length} listing{jobs.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {searching && (
        <p className="mt-6 text-sm text-ink-700">Pulling listings and scoring them against your stack…</p>
      )}
      {error && <p className="mt-6 text-sm text-rust-700">{error}</p>}
      {!searching && !error && jobs === null && (
        <p className="mt-6 text-sm text-ink-700">
          Results show up here with links out to the original job boards.
        </p>
      )}
      {!searching && !error && jobs?.length === 0 && (
        <p className="mt-6 text-sm text-ink-700">
          No matches in range. Try remote, a wider commute, or another repo.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {jobs?.map((job) => (
          <li
            key={job.id}
            className="rounded-xl border border-ink-900/8 bg-paper-50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl font-medium text-ink-950">{job.title}</h3>
                <p className="mt-0.5 text-sm text-ink-700">
                  {job.company} · {job.location}
                </p>
              </div>
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-full bg-ink-950 px-3 py-1.5 text-sm font-semibold text-paper-50 hover:bg-ink-900"
              >
                Open listing
              </a>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="chip">{job.board}</span>
              {job.commuteLabel && (
                <span className="chip">{job.commuteLabel}</span>
              )}
              {job.score > 0 && <span className="chip">Match {job.score}</span>}
            </div>
            {job.snippet && (
              <p className="mt-3 text-sm leading-relaxed text-ink-700">{job.snippet}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
