import { useState } from 'react'
import { profileDroppedItems, profileDirectoryHandle } from '@/lib/analyzeRepos'

type Props = {
  onRepos: (repos: Awaited<ReturnType<typeof profileDroppedItems>>) => void
  onGithub: (url: string) => Promise<void>
  busy?: boolean
}

export function RepoDropZone({ onRepos, onGithub, busy }: Props) {
  const [over, setOver] = useState(false)
  const [githubUrl, setGithubUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const canPick = typeof window !== 'undefined' && 'showDirectoryPicker' in window

  async function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    setOver(false)
    setError(null)
    try {
      const repos = await profileDroppedItems(event.dataTransfer.items)
      if (!repos.length) {
        setError('Drop a project folder (not a single random file).')
        return
      }
      onRepos(repos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that folder')
    }
  }

  async function pickFolder() {
    setError(null)
    try {
      const handle = await window.showDirectoryPicker()
      const repo = await profileDirectoryHandle(handle)
      onRepos([repo])
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Could not open folder')
    }
  }

  async function addGithub(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await onGithub(githubUrl)
      setGithubUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub lookup failed')
    }
  }

  return (
    <section className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-card">
      <h2 className="font-serif text-2xl font-medium text-ink-950">Your repos</h2>
      <p className="mt-1 text-sm text-ink-700">
        Drag in project folders. We read manifests and READMEs in the browser — source
        stays on your machine.
      </p>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={handleDrop}
        className={`mt-4 flex min-h-[160px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition ${
          over
            ? 'border-rust-500 bg-rust-500/5'
            : 'border-ink-900/15 bg-paper-50'
        }`}
      >
        <p className="font-medium text-ink-950">Drop folders here</p>
        <p className="mt-1 max-w-sm text-sm text-ink-700">
          Chrome and Edge support folder drop. You can also pick a directory or paste a
          public GitHub URL.
        </p>
        {canPick && (
          <button
            type="button"
            onClick={pickFolder}
            disabled={busy}
            className="mt-4 rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-paper-50 hover:bg-ink-900 disabled:opacity-50"
          >
            Choose folder
          </button>
        )}
      </div>

      <form onSubmit={addGithub} className="mt-4 flex gap-2">
        <input
          value={githubUrl}
          onChange={(event) => setGithubUrl(event.target.value)}
          placeholder="https://github.com/owner/repo"
          className="min-w-0 flex-1 rounded-lg border border-ink-900/15 bg-paper-50 px-3 py-2 text-sm outline-none ring-rust-500/40 focus:ring-2"
        />
        <button
          type="submit"
          disabled={busy || !githubUrl.trim()}
          className="rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm font-semibold hover:bg-paper-100 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-rust-700">{error}</p>}
    </section>
  )
}
