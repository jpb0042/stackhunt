import type { PlaceSuggestion } from '../shared/types'
import { googleJson } from './google'

type PlacePrediction = {
  placeId?: string
  text?: { text?: string }
  structuredFormat?: {
    mainText?: { text?: string }
    secondaryText?: { text?: string }
  }
}

type AddressComponent = {
  longText?: string
  shortText?: string
  types?: string[]
}

const suggestCache = new Map<string, { at: number; places: PlaceSuggestion[] }>()
const detailsCache = new Map<string, { at: number; place: PlaceSuggestion }>()
const CACHE_MS = 10 * 60 * 1000

function component(parts: AddressComponent[], type: string): AddressComponent | undefined {
  return parts.find((part) => part.types?.includes(type))
}

function formatDetailsLabel(formatted: string | undefined, parts: AddressComponent[]): string {
  const street = [component(parts, 'street_number')?.longText, component(parts, 'route')?.longText]
    .filter(Boolean)
    .join(' ')
  const city =
    component(parts, 'locality')?.longText ||
    component(parts, 'sublocality')?.longText ||
    component(parts, 'postal_town')?.longText
  const state = component(parts, 'administrative_area_level_1')?.shortText
  const compact = [street, city, state].filter(Boolean)
  if (compact.length >= 2) return compact.join(', ')
  if (formatted) {
    return formatted
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part && !/united states|usa/i.test(part) && !/^\d{5}/.test(part))
      .slice(0, 3)
      .join(', ')
  }
  return compact.join(', ')
}

function predictionLabel(prediction: PlacePrediction): string {
  const main = prediction.structuredFormat?.mainText?.text
  const secondary = prediction.structuredFormat?.secondaryText?.text
  if (main && secondary) return `${main}, ${secondary}`
  return prediction.text?.text?.trim() || main || ''
}

export async function suggestPlaces(
  query: string,
  sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  const q = query.trim()
  if (!q) return []

  const cacheKey = q.toLowerCase()
  const hit = suggestCache.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.places

  const data = (await googleJson('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    fieldMask:
      'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
    body: JSON.stringify({
      input: q,
      languageCode: 'en',
      ...(sessionToken ? { sessionToken } : {}),
    }),
  })) as { suggestions?: Array<{ placePrediction?: PlacePrediction }> }

  const seen = new Set<string>()
  const places: PlaceSuggestion[] = []
  for (const suggestion of data.suggestions ?? []) {
    const prediction = suggestion.placePrediction
    const id = prediction?.placeId
    const label = prediction ? predictionLabel(prediction) : ''
    if (!id || !label || seen.has(id)) continue
    seen.add(id)
    places.push({ id, label })
    if (places.length >= 5) break
  }

  suggestCache.set(cacheKey, { at: Date.now(), places })
  return places
}

export async function resolvePlace(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceSuggestion> {
  const id = placeId.trim()
  if (!id) throw new Error('Missing place id.')

  const hit = detailsCache.get(id)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.place

  const path = `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`
  const url = sessionToken
    ? `${path}?sessionToken=${encodeURIComponent(sessionToken)}`
    : path
  const data = (await googleJson(url, {
    method: 'GET',
    fieldMask: 'id,formattedAddress,location,addressComponents',
  })) as {
    id?: string
    formattedAddress?: string
    location?: { latitude?: number; longitude?: number }
    addressComponents?: AddressComponent[]
  }

  const lat = data.location?.latitude
  const lon = data.location?.longitude
  const label = formatDetailsLabel(data.formattedAddress, data.addressComponents ?? [])
  if (!label || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('Could not locate that address.')
  }

  const place: PlaceSuggestion = { id: data.id || id, label, lat, lon }
  detailsCache.set(id, { at: Date.now(), place })
  return place
}
