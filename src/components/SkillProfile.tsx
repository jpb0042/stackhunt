import type { RepoProfile } from '@shared/types'

type Props = {
  repos: RepoProfile[]
  onRemove: (name: string) => void
}

export function SkillProfile({ repos, onRemove }: Props) {
  if (!repos.length) return null

  const skills = [...new Set(repos.flatMap((repo) => repo.skills))]
  const languages = [...new Set(repos.flatMap((repo) => repo.languages))]

  return (
    <section className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-card">
      <h2 className="font-serif text-2xl font-medium text-ink-950">Inferred stack</h2>
      <ul className="mt-3 space-y-2">
        {repos.map((repo) => (
          <li
            key={`${repo.source}-${repo.name}`}
            className="flex items-center justify-between gap-3 rounded-lg bg-paper-50 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-semibold text-ink-950">{repo.name}</p>
              <p className="text-ink-700">
                {repo.source === 'github' ? 'GitHub' : 'Local folder'} · {repo.filesScanned}{' '}
                files scanned
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(repo.name)}
              className="text-xs font-semibold text-ink-700 hover:text-rust-600"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {languages.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Languages
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {languages.map((item) => (
              <span key={item} className="chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Skills
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((item) => (
              <span key={item} className="chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
