import { useRef, useState } from 'react'
import { FolderOpen, GitBranch, Loader2, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { profileDirectoryHandle, profileDroppedItems } from '@/lib/analyzeRepos'
import { cn } from '@/lib/utils'
import type { RepoProfile } from '@shared/types'

type Props = {
  repos: RepoProfile[]
  onRepos: (repos: RepoProfile[]) => void
  onGithub: (url: string) => Promise<void>
  onRemove: (name: string) => void
  busy?: boolean
}

export function RepoDropZone({ repos, onRepos, onGithub, onRemove, busy }: Props) {
  const [over, setOver] = useState(false)
  const [reading, setReading] = useState(false)
  const [githubUrl, setGithubUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dragDepth = useRef(0)
  const canPick = typeof window !== 'undefined' && 'showDirectoryPicker' in window

  const stack = [...new Set(repos.flatMap((repo) => [...repo.languages, ...repo.skills]))]

  async function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    dragDepth.current = 0
    setOver(false)
    setError(null)
    setReading(true)
    try {
      const dropped = await profileDroppedItems(event.dataTransfer.items)
      if (!dropped.length) {
        setError('Drop a project folder so we can read its manifests.')
        return
      }
      onRepos(dropped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that folder')
    } finally {
      setReading(false)
    }
  }

  async function pickFolder() {
    setError(null)
    try {
      const handle = await window.showDirectoryPicker()
      setReading(true)
      onRepos([await profileDirectoryHandle(handle)])
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Could not open that folder')
    } finally {
      setReading(false)
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
    <div className="space-y-4">
      <div
        onDragEnter={(event) => {
          event.preventDefault()
          dragDepth.current += 1
          setOver(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault()
          dragDepth.current -= 1
          if (dragDepth.current <= 0) setOver(false)
        }}
        onDrop={handleDrop}
        className={cn(
          'group relative flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition-all duration-300',
          over
            ? 'border-primary/70 bg-primary/[0.07] shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_0_60px_-12px_hsl(var(--primary)/0.45)]'
            : 'border-border bg-secondary/25 hover:border-border/80 hover:bg-secondary/40',
        )}
      >
        <div
          className={cn(
            'flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-background/70 transition-transform duration-300',
            over && 'scale-110 border-primary/50',
          )}
        >
          {reading ? (
            <Loader2 className="size-6 animate-spin text-primary" />
          ) : (
            <FolderOpen
              className={cn(
                'size-6 text-muted-foreground transition-colors',
                over && 'text-primary',
              )}
            />
          )}
        </div>

        <p className="mt-5 text-lg font-semibold tracking-tight">
          {reading ? 'Reading your repos…' : 'Drop your repos here'}
        </p>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          Manifests and READMEs are parsed in your browser. Your source never leaves this
          machine.
        </p>

        {canPick && (
          <Button
            type="button"
            variant="outline"
            onClick={pickFolder}
            disabled={busy || reading}
            className="mt-6"
          >
            <Plus />
            Choose folder
          </Button>
        )}
      </div>

      <form onSubmit={addGithub} className="flex gap-2">
        <div className="relative flex-1">
          <GitBranch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={githubUrl}
            onChange={(event) => setGithubUrl(event.target.value)}
            placeholder="github.com/owner/repo"
            className="pl-10"
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          disabled={busy || !githubUrl.trim()}
          className="h-11"
        >
          {busy ? <Loader2 className="animate-spin" /> : 'Add'}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {repos.length > 0 && (
        <div className="space-y-3 rounded-xl border border-border/70 bg-secondary/25 p-4">
          <div className="flex flex-wrap gap-2">
            {repos.map((repo) => (
              <span
                key={`${repo.source}-${repo.name}`}
                className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 py-1 pl-2.5 pr-1.5 text-sm"
              >
                <span className="font-mono text-[13px]">{repo.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(repo.name)}
                  aria-label={`Remove ${repo.name}`}
                  className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>

          {stack.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
              {stack.map((item) => (
                <Badge key={item} variant="secondary">
                  {item}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
