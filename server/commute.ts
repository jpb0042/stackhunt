import type { JobListing } from '../shared/types'

type Coords = { lat: number; lon: number }

const geoCache = new Map<string, Coords | null>()

function haversineMiles(a: Coords, b: Coords): number {
  const toRad = (n: number) => (n * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

async function geocodeAddress(address: string): Promise<Coords | null> {
  const key = `addr:${address.toLowerCase().trim()}`
  if (geoCache.has(key)) return geoCache.get(key) ?? null
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Stackhunt/0.1 (job search app)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    geoCache.set(key, null)
    return null
  }
  const data = (await res.json()) as Array<{ lat: string; lon: string }>
  const coords = data[0] ? { lat: Number(data[0].lat), lon: Number(data[0].lon) } : null
  geoCache.set(key, coords)
  return coords
}

async function geocodePlace(place: string): Promise<Coords | null> {
  const cleaned = place.split('·')[0]?.trim() || place
  if (!cleaned || /remote|anywhere|not specified|flexible/i.test(cleaned)) return null
  const key = `place:${cleaned.toLowerCase()}`
  if (geoCache.has(key)) return geoCache.get(key) ?? null
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleaned)}&count=1&language=en&format=json`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    geoCache.set(key, null)
    return null
  }
  const data = (await res.json()) as { results?: Array<{ latitude: number; longitude: number }> }
  const first = data.results?.[0]
  const coords = first ? { lat: first.latitude, lon: first.longitude } : null
  geoCache.set(key, coords)
  return coords
}

async function drivingCommute(
  from: Coords,
  to: Coords,
): Promise<{ miles: number; minutes: number } | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = (await res.json()) as {
      routes?: Array<{ distance: number; duration: number }>
    }
    const route = data.routes?.[0]
    if (!route) return null
    return {
      miles: route.distance * 0.000621371,
      minutes: route.duration / 60,
    }
  } catch {
    return null
  }
}

function formatCommute(miles: number, minutes: number | null, driving: boolean): string {
  const mileText = miles < 10 ? miles.toFixed(1) : String(Math.round(miles))
  if (minutes != null && driving) {
    const mins = Math.max(1, Math.round(minutes))
    return `${mileText} mi · ${mins} min drive`
  }
  return `${mileText} mi straight-line`
}

export async function attachCommute(
  jobs: JobListing[],
  address: string | undefined,
  workMode: 'remote' | 'in-person' | 'both',
  maxCommuteMiles: number,
): Promise<JobListing[]> {
  if (workMode === 'remote' || !address?.trim()) {
    return jobs.map((job) => ({
      ...job,
      commuteLabel: job.remote ? 'Remote' : null,
    }))
  }

  const origin = await geocodeAddress(address)
  if (!origin) {
    throw new Error('Could not find that address. Try a fuller street, city, and state.')
  }

  const uniquePlaces = [...new Set(jobs.filter((job) => !job.remote).map((job) => job.location))]
  const placeCoords = new Map<string, Coords | null>()
  await Promise.all(
    uniquePlaces.map(async (place) => {
      placeCoords.set(place, await geocodePlace(place))
    }),
  )

  const routeCache = new Map<string, { miles: number; minutes: number } | null>()
  await Promise.all(
    uniquePlaces.map(async (place) => {
      const dest = placeCoords.get(place)
      if (!dest) {
        routeCache.set(place, null)
        return
      }
      const route = await drivingCommute(origin, dest)
      if (route) routeCache.set(place, route)
      else {
        const miles = haversineMiles(origin, dest)
        routeCache.set(place, { miles, minutes: miles * 1.5 })
      }
    }),
  )

  const withCommute: JobListing[] = []
  for (const job of jobs) {
    if (job.remote) {
      withCommute.push({
        ...job,
        commuteLabel: job.remote ? 'Remote' : null,
      })
      continue
    }
    const dest = placeCoords.get(job.location) ?? null
    const route = routeCache.get(job.location)
    if (!dest || !route) {
      if (workMode === 'both') {
        withCommute.push({ ...job, commuteLabel: 'Location unclear' })
      }
      continue
    }
    if (route.miles > maxCommuteMiles) continue
    withCommute.push({
      ...job,
      commuteMiles: route.miles,
      commuteMinutes: route.minutes,
      commuteLabel: formatCommute(route.miles, route.minutes, true),
    })
  }

  return withCommute.sort((a, b) => {
    if (a.remote !== b.remote) return a.remote ? 1 : -1
    return (a.commuteMiles ?? 9999) - (b.commuteMiles ?? 9999) || b.score - a.score
  })
}
