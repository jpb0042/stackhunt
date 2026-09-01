import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { resolvePlace, suggestPlaces } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { PlaceSuggestion } from '@shared/types'

type Props = {
  id?: string
  value: string
  selected: boolean
  onChange: (value: string) => void
  onSelect: (place: PlaceSuggestion) => void
}

function newSession(): string {
  return crypto.randomUUID()
}

export function AddressAutocomplete({ id, value, selected, onChange, onSelect }: Props) {
  const listId = useId()
  const root = useRef<HTMLDivElement>(null)
  const session = useRef(newSession())
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [places, setPlaces] = useState<PlaceSuggestion[]>([])
  const [active, setActive] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = value.trim()
    if (selected) {
      setPlaces([])
      setLoading(false)
      setError(null)
      return
    }
    if (!q) {
      setPlaces([])
      setLoading(false)
      setError(null)
      setOpen(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const timer = window.setTimeout(async () => {
      try {
        const next = await suggestPlaces(q, controller.signal, session.current)
        if (controller.signal.aborted) return
        setPlaces(next)
        setActive(0)
        setOpen(true)
      } catch (err) {
        if (controller.signal.aborted) return
        setPlaces([])
        setError(err instanceof Error ? err.message : 'Could not look up addresses')
        setOpen(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 120)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [value, selected])

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  async function pick(place: PlaceSuggestion) {
    if (resolving) return
    setResolving(true)
    setError(null)
    try {
      const resolved =
        place.lat != null && place.lon != null
          ? place
          : await resolvePlace(place.id, session.current)
      if (resolved.lat == null || resolved.lon == null) {
        throw new Error('Could not locate that address.')
      }
      onSelect(resolved)
      session.current = newSession()
      setOpen(false)
      setPlaces([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not locate that address')
      setOpen(true)
    } finally {
      setResolving(false)
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp') && places.length) {
      setOpen(true)
      return
    }
    if (!open) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % Math.max(places.length, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i - 1 + Math.max(places.length, 1)) % Math.max(places.length, 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (places[active]) void pick(places[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const typed = value.trim()
  const showList =
    open && !selected && typed.length > 0 && (places.length > 0 || Boolean(error) || resolving)
  const busy = loading || resolving

  return (
    <div ref={root} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={value}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && places[active] ? `${listId}-${places[active].id}` : undefined}
          placeholder="123 Main St, Austin, TX"
          className="pl-10 pr-10"
          onChange={(event) => {
            onChange(event.target.value)
          }}
          onFocus={() => {
            if (!selected && places.length) setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
        {busy && (
          <Loader2 className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-border/80 bg-popover p-1 shadow-[0_16px_48px_-24px_hsl(0_0%_0%/0.9)]"
        >
          {places.map((place, index) => (
            <li key={place.id} role="presentation">
              <button
                id={`${listId}-${place.id}`}
                type="button"
                role="option"
                aria-selected={index === active}
                disabled={resolving}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                  index === active
                    ? 'bg-primary/15 text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void pick(place)}
              >
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{place.label}</span>
              </button>
            </li>
          ))}
          {!loading && !places.length && error && (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">{error}</li>
          )}
        </ul>
      )}
    </div>
  )
}
