import type { WorkMode } from '@shared/types'

type Props = {
  workMode: WorkMode
  address: string
  maxCommuteMiles: number
  canSearch: boolean
  searching: boolean
  onWorkMode: (mode: WorkMode) => void
  onAddress: (value: string) => void
  onMaxCommute: (miles: number) => void
  onSearch: () => void
}

const MODES: Array<{ id: WorkMode; label: string; hint: string }> = [
  { id: 'remote', label: 'Remote', hint: 'Anywhere' },
  { id: 'in-person', label: 'In person', hint: 'Commute from your address' },
  { id: 'both', label: 'Both', hint: 'Remote + nearby offices' },
]

export function SearchPreferences({
  workMode,
  address,
  maxCommuteMiles,
  canSearch,
  searching,
  onWorkMode,
  onAddress,
  onMaxCommute,
  onSearch,
}: Props) {
  const needsAddress = workMode !== 'remote'
  const addressMissing = needsAddress && !address.trim()

  return (
    <section className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-card">
      <h2 className="font-serif text-2xl font-medium text-ink-950">Where you’ll work</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {MODES.map((mode) => {
          const active = workMode === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onWorkMode(mode.id)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? 'border-ink-950 bg-ink-950 text-paper-50'
                  : 'border-ink-900/10 bg-paper-50 hover:border-ink-900/25'
              }`}
            >
              <span className="block text-sm font-semibold">{mode.label}</span>
              <span className={`mt-0.5 block text-xs ${active ? 'text-paper-200' : 'text-ink-700'}`}>
                {mode.hint}
              </span>
            </button>
          )
        })}
      </div>

      {needsAddress && (
        <label className="mt-4 block">
          <span className="text-sm font-semibold text-ink-950">Home or office address</span>
          <input
            value={address}
            onChange={(event) => onAddress(event.target.value)}
            required
            placeholder="123 Main St, Austin, TX"
            className="mt-1 w-full rounded-lg border border-ink-900/15 bg-paper-50 px-3 py-2 text-sm outline-none ring-rust-500/40 focus:ring-2"
          />
          <span className="mt-1 block text-xs text-ink-700">
            Required for in-person listings. We use it only to estimate commute.
          </span>
        </label>
      )}

      {needsAddress && (
        <label className="mt-4 block">
          <span className="flex items-center justify-between text-sm font-semibold text-ink-950">
            Max commute
            <span className="font-normal text-ink-700">{maxCommuteMiles} miles</span>
          </span>
          <input
            type="range"
            min={5}
            max={80}
            step={5}
            value={maxCommuteMiles}
            onChange={(event) => onMaxCommute(Number(event.target.value))}
            className="mt-2 w-full accent-rust-600"
          />
        </label>
      )}

      <button
        type="button"
        onClick={onSearch}
        disabled={!canSearch || searching || addressMissing}
        className="mt-5 w-full rounded-full bg-rust-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rust-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {searching ? 'Searching boards…' : 'Find matching jobs'}
      </button>
      {addressMissing && (
        <p className="mt-2 text-sm text-rust-700">Add an address to search in-person jobs.</p>
      )}
      {!canSearch && !addressMissing && (
        <p className="mt-2 text-sm text-ink-700">Drop a repo first so we know what you build.</p>
      )}
    </section>
  )
}
