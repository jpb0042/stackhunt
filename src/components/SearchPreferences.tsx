import { Building2, Globe, Loader2, Search, Shuffle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { PlaceSuggestion, WorkMode } from '@shared/types'

type Props = {
  workMode: WorkMode
  address: string
  addressSelected: boolean
  maxCommuteMiles: number
  canSearch: boolean
  searching: boolean
  onWorkMode: (mode: WorkMode) => void
  onAddress: (value: string) => void
  onPlace: (place: PlaceSuggestion) => void
  onMaxCommute: (miles: number) => void
  onSearch: () => void
}

const MODES: Array<{ id: WorkMode; label: string; icon: LucideIcon }> = [
  { id: 'remote', label: 'Remote', icon: Globe },
  { id: 'in-person', label: 'In person', icon: Building2 },
  { id: 'both', label: 'Both', icon: Shuffle },
]

export function SearchPreferences({
  workMode,
  address,
  addressSelected,
  maxCommuteMiles,
  canSearch,
  searching,
  onWorkMode,
  onAddress,
  onPlace,
  onMaxCommute,
  onSearch,
}: Props) {
  const needsAddress = workMode !== 'remote'
  const addressMissing = needsAddress && !addressSelected
  const blocked = !canSearch || addressMissing

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Where you want to work
        </Label>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-xl border border-border/70 bg-secondary/30 p-1.5">
          {MODES.map((mode) => {
            const active = workMode === mode.id
            const Icon = mode.icon
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onWorkMode(mode.id)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-background text-foreground shadow-[0_1px_0_0_hsl(0_0%_100%/0.06)_inset,0_6px_16px_-8px_hsl(0_0%_0%/0.8)]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className={cn('size-4', active && 'text-primary')} />
                {mode.label}
              </button>
            )
          })}
        </div>
      </div>

      {needsAddress && (
        <div className="relative z-20 animate-fade-up space-y-5">
          <div className="space-y-2">
            <Label htmlFor="address">Home address</Label>
            <AddressAutocomplete
              id="address"
              value={address}
              selected={addressSelected}
              onChange={onAddress}
              onSelect={onPlace}
            />
            <p className="text-xs text-muted-foreground">
              Type your address, then select a match from the list.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <Label>Max commute</Label>
              <span className="font-mono text-sm text-primary">{maxCommuteMiles} mi</span>
            </div>
            <Slider
              value={[maxCommuteMiles]}
              min={5}
              max={80}
              step={5}
              onValueChange={([value]) => onMaxCommute(value)}
            />
          </div>
        </div>
      )}

      <Button
        size="lg"
        onClick={onSearch}
        disabled={blocked || searching}
        className="w-full"
      >
        {searching ? (
          <>
            <Loader2 className="animate-spin" />
            Searching job boards…
          </>
        ) : (
          <>
            <Search />
            Find matching jobs
          </>
        )}
      </Button>

      {!canSearch && (
        <p className="text-center text-sm text-muted-foreground">
          Add at least one repo so we know what you build.
        </p>
      )}
      {canSearch && addressMissing && (
        <p className="text-center text-sm text-muted-foreground">
          {address.trim()
            ? 'Select an address from the list to continue.'
            : 'An address is required for in-person results.'}
        </p>
      )}
    </div>
  )
}
