export function googleKey(): string {
  const key = process.env.GOOGLE_API_KEY?.trim()
  if (!key) throw new Error('GOOGLE_API_KEY is not set.')
  return key
}

export async function googleJson(
  url: string,
  init: RequestInit & { fieldMask?: string } = {},
): Promise<unknown> {
  const { fieldMask, headers, ...rest } = init
  const res = await fetch(url, {
    ...rest,
    signal: rest.signal ?? AbortSignal.timeout(10000),
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleKey(),
      ...(fieldMask ? { 'X-Goog-FieldMask': fieldMask } : {}),
      ...headers,
    },
  })
  const text = await res.text()
  const body = parseGoogleBody(text) as {
    error?: { message?: string; status?: string }
    status?: string
    error_message?: string
  } | null
  if (!res.ok) {
    const message = body?.error?.message || `Google request failed (${res.status})`
    throw new Error(message)
  }
  if (body && typeof body.status === 'string' && body.status !== 'OK' && body.status !== 'ZERO_RESULTS') {
    throw new Error(body.error_message || `Google geocoding ${body.status}`)
  }
  return body
}

function parseGoogleBody(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    const rows = trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line)]
        } catch {
          return []
        }
      })
    return rows.length ? rows : null
  }
}
