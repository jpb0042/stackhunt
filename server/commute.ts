import type { JobListing } from '../shared/types'
import { googleJson, googleKey } from './google'

type Coords = { lat: number; lon: number }

const geoCache = new Map<string, Coords | null>()
const MATRIX_BATCH = 25

function waypoint(coords: Coords) {
  return {
    waypoint: {
      location: { latLng: { latitude: coords.lat, longitude: coords.lon } },
    },
  }
}

function parseDurationSeconds(value: string | undefined): number | null {
  if (!value) return null
  const match = /^([\d.]+)s$/.exec(value)
  if (!match) return null
  return Number(match[1])
}

async function geocodePlace(place: string): Promise<Coords | null> {
  const cleaned = place.split('·')[0]?.trim() || place
  if (!cleaned || /remote|anywhere|not specified|flexible/i.test(cleaned)) return null
  const key = `place:${cleaned.toLowerCase()}`
  if (geoCache.has(key)) return geoCache.get(key) ?? null

  const url =
    'https://maps.googleapis.com/maps/api/geocode/json' +
    `?address=${encodeURIComponent(cleaned)}&key=${encodeURIComponent(googleKey())}`
  const data = (await googleJson(url, { method: 'GET' })) as {
    results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>
  }
  const location = data.results?.[0]?.geometry?.location
  const coords =
    location && Number.isFinite(location.lat) && Number.isFinite(location.lng)
      ? { lat: location.lat, lon: location.lng }
      : null
  geoCache.set(key, coords)
  return coords
}

async function drivingMatrix(
  origin: Coords,
  destinations: Coords[],
): Promise<Array<{ miles: number; minutes: number } | null>> {
  if (!destinations.length) return []
  const data = await googleJson(
    'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
    {
      method: 'POST',
      fieldMask: 'originIndex,destinationIndex,duration,distanceMeters,condition',
      body: JSON.stringify({
        origins: [waypoint(origin)],
        destinations: destinations.map(waypoint),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
      }),
    },
  )
  const elements = Array.isArray(data) ? data : data ? [data] : []
  const rows: Array<{ miles: number; minutes: number } | null> = destinations.map(() => null)
  for (const element of elements as Array<{
    destinationIndex?: number
    duration?: string
    distanceMeters?: number
    condition?: string
  }>) {
    const index = element.destinationIndex ?? 0
    const seconds = parseDurationSeconds(element.duration)
    const meters = element.distanceMeters
    if (element.condition && element.condition !== 'ROUTE_EXISTS') continue
    if (meters == null || seconds == null) continue
    rows[index] = {
      miles: meters * 0.000621371,
      minutes: seconds / 60,
    }
  }
  return rows
}

async function drivingCommutes(
  origin: Coords,
  destinations: Coords[],
): Promise<Array<{ miles: number; minutes: number } | null>> {
  const results: Array<{ miles: number; minutes: number } | null> = []
  for (let i = 0; i < destinations.length; i += MATRIX_BATCH) {
    results.push(...(await drivingMatrix(origin, destinations.slice(i, i + MATRIX_BATCH))))
  }
  return results
}

function formatCommute(miles: number, minutes: number): string {
  const mileText = miles < 10 ? miles.toFixed(1) : String(Math.round(miles))
  const mins = Math.max(1, Math.round(minutes))
  return `${mileText} mi · ${mins} min drive`
}

function parseOrigin(lat: number | undefined, lon: number | undefined): Coords | null {
  if (lat == null || lon == null) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return { lat, lon }
}

export async function attachCommute(
  jobs: JobListing[],
  address: string | undefined,
  workMode: 'remote' | 'in-person' | 'both',
  maxCommuteMiles: number,
  originLat?: number,
  originLon?: number,
): Promise<JobListing[]> {
  if (workMode === 'remote' || !address?.trim()) {
    return jobs.map((job) => ({
      ...job,
      commuteLabel: job.remote ? 'Remote' : null,
    }))
  }

  const origin = parseOrigin(originLat, originLon)
  if (!origin) {
    throw new Error('Select an address from the suggestions so we can estimate commute.')
  }

  const uniquePlaces = [...new Set(jobs.filter((job) => !job.remote).map((job) => job.location))]
  const placeCoords = new Map<string, Coords | null>()
  await Promise.all(
    uniquePlaces.map(async (place) => {
      placeCoords.set(place, await geocodePlace(place))
    }),
  )

  const routable = uniquePlaces.filter((place) => placeCoords.get(place))
  const destCoords = routable.map((place) => placeCoords.get(place)!)
  const routes = await drivingCommutes(origin, destCoords)
  const routeCache = new Map<string, { miles: number; minutes: number } | null>()
  routable.forEach((place, index) => {
    routeCache.set(place, routes[index] ?? null)
  })

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
    if (!dest || !route) continue
    if (route.miles > maxCommuteMiles) continue
    withCommute.push({
      ...job,
      commuteMiles: route.miles,
      commuteMinutes: route.minutes,
      commuteLabel: formatCommute(route.miles, route.minutes),
    })
  }

  console.log(
    `[commute] onsite=${jobs.filter((job) => !job.remote).length} places=${uniquePlaces.length} geocoded=${routable.length} kept=${withCommute.filter((job) => !job.remote).length}`,
  )

  return withCommute.sort((a, b) => {
    if (a.remote !== b.remote) return a.remote ? 1 : -1
    return (a.commuteMiles ?? 9999) - (b.commuteMiles ?? 9999) || b.score - a.score
  })
}
