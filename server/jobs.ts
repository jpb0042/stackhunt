import type { JobListing, SearchPage, SearchRequest, WorkMode } from '../shared/types'

const FETCH_MS = 9000

type RawJob = Omit<JobListing, 'score' | 'commuteMiles' | 'commuteMinutes' | 'commuteLabel'>

function isRemoteText(value: string): boolean {
  return /remote|work from home|\bwfh\b|distributed|anywhere|flexible\s*\/\s*remote/i.test(
    value,
  )
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function snippet(value: string): string {
  const text = stripHtml(value)
  return text.length > 220 ? `${text.slice(0, 217)}…` : text
}

async function getJson(url: string, headers?: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Stackhunt/0.1 (job search app)',
      Accept: 'application/json',
      ...headers,
    },
    signal: AbortSignal.timeout(FETCH_MS),
  })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.json()
}

function scoreJob(job: RawJob, skills: string[], languages: string[]): number {
  const hay = `${job.title} ${job.company} ${job.snippet} ${job.location}`.toLowerCase()
  const title = job.title.toLowerCase()
  let score = 0
  for (const skill of [...skills, ...languages]) {
    const key = skill.toLowerCase()
    if (!key) continue
    if (title.includes(key)) score += 6
    else if (hay.includes(key)) score += 2
  }
  return score
}

function queryFromSkills(skills: string[], languages: string[]): string {
  return primaryRole(skills, languages)
}

const ROLE_PREFERENCE = [
  'React',
  'Next.js',
  'Vue',
  'Angular',
  'Python',
  'Go',
  'Rust',
  'Java',
  'Node.js',
  'TypeScript',
  'Ruby',
  'PHP',
  'C#',
  'Swift',
  'Kotlin',
]

function primaryRole(skills: string[], languages: string[]): string {
  const have = new Map(
    [...skills, ...languages].map((item) => [item.toLowerCase(), item]),
  )
  for (const name of ROLE_PREFERENCE) {
    const match = have.get(name.toLowerCase())
    if (match) return match
  }
  return skills[0] || languages[0] || 'software'
}

const COUNTRY_SUFFIX = /^(united states|usa|us|u\.s\.a?\.?|canada|uk|united kingdom|england)$/i

function cityFromAddress(address: string): string | null {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  while (parts.length) {
    const last = parts[parts.length - 1].replace(/\d+/g, '').trim()
    if (COUNTRY_SUFFIX.test(last) || /^\d{5}(-\d{4})?$/.test(parts[parts.length - 1])) {
      parts.pop()
      continue
    }
    break
  }
  if (parts.length >= 2) {
    const region = parts[parts.length - 1].replace(/\d+/g, '').trim()
    const city = parts[parts.length - 2]
    if (city && region) return `${city}, ${region}`
    return city || null
  }
  return parts[0] || null
}

function uniquePreferredRoles(skills: string[], languages: string[]): string[] {
  const have = new Map(
    [...skills, ...languages].map((item) => [item.toLowerCase(), item]),
  )
  const roles: string[] = []
  for (const name of ROLE_PREFERENCE) {
    if (have.has(name.toLowerCase())) roles.push(name)
    if (roles.length === 3) break
  }
  if (!roles.length) roles.push(primaryRole(skills, languages))
  return roles
}

function jsearchQueries(
  skills: string[],
  languages: string[],
  workMode: WorkMode,
  address: string,
): string[] {
  const place =
    workMode === 'remote' ? 'the United States' : cityFromAddress(address) || 'united states'
  return uniquePreferredRoles(skills, languages).map(
    (role) => `${role} developer jobs in ${place}`,
  )
}

const US_STATE_ABBR =
  /,\s*(A[LKZR]|C[AOT]|D[CE]|FL|GA|HI|I[DLNA]|K[SY]|LA|M[EDAINSOT]|N[EVHJMYCD]|O[HKR]|P[AR]|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])\b/i

const US_STATE_NAME =
  /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|district of columbia)\b/i

const US_COUNTRY =
  /\b(united states(?: of america)?|u\.s\.a?\.?|usa)\b/i

const WORLDWIDE_REMOTE =
  /\b(worldwide|global|work from anywhere|anywhere in the world|any location|unrestricted|multiple countries|north america|americas?)\b/i

const OVERSEAS_REGION =
  /\b(europe|european union|\beu\b|emea|latam|latin america|apac|asia(?:-pacific)?|africa|india|united kingdom|\buk\b|england|scotland|wales|ireland|canada|mexico|germany|france|netherlands|spain|poland|ukraine|australia|brazil|argentina|philippines|nigeria|pakistan|bangladesh|china|japan|singapore|sweden|norway|denmark|finland|switzerland|austria|belgium|italy|portugal|romania|hungary|czech|israel|uae|dubai|estonia|lithuania|latvia|colombia|chile|peru)\b/i

const OVERSEAS_CITY =
  /\b(london|manchester|berlin|munich|amsterdam|dublin|paris|toronto|vancouver|montreal|ottawa|bangalore|bengaluru|hyderabad|pune|sydney|melbourne|warsaw|krakow|barcelona|lisbon|tel aviv|sao paulo)\b/i

function hasUsSignal(value: string): boolean {
  return US_COUNTRY.test(value) || US_STATE_ABBR.test(value) || US_STATE_NAME.test(value)
}

function isUnconstrainedRemote(value: string): boolean {
  return /^(remote|not specified|flexible|anywhere)?$/i.test(value.trim())
}

function allowsUsRemote(location: string): boolean {
  const value = location.trim()
  if (!value) return true
  if (hasUsSignal(value)) return true
  const overseas = OVERSEAS_REGION.test(value) || OVERSEAS_CITY.test(value)
  if (overseas && !WORLDWIDE_REMOTE.test(value)) return false
  if (WORLDWIDE_REMOTE.test(value) && !/except.{0,24}\b(us|usa|u\.s\.|united states)\b/i.test(value)) {
    return true
  }
  if (isUnconstrainedRemote(value)) return true
  return !overseas
}

function isOverseasOnsite(location: string): boolean {
  const value = location.trim()
  if (!value || hasUsSignal(value)) return false
  return OVERSEAS_REGION.test(value) || OVERSEAS_CITY.test(value)
}

function matchesRegion(job: RawJob): boolean {
  if (job.remote) return allowsUsRemote(job.location)
  return !isOverseasOnsite(job.location)
}

const EXCLUDED_PUBLISHERS = [
  'Lensa',
  'Jooble',
  'Jobright',
  'Remote Spark',
  'Remote Zest Jobs',
  'Talents By Vaia',
  'JobMESH',
  'Iitjobs',
  'Jobgether',
  'Learn4Good',
  'Vacancy Global Pro',
]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fromMuse(queryHint: string): Promise<RawJob[]> {
  const pages = [0, 1]
  const results = await Promise.allSettled(
    pages.map((page) =>
      getJson(
        `https://www.themuse.com/api/public/jobs?category=Software%20Engineering&page=${page}&descending=true`,
      ),
    ),
  )
  const jobs: RawJob[] = []
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const payload = result.value as {
      results?: Array<{
        id: number
        name: string
        contents?: string
        locations?: Array<{ name: string }>
        company?: { name: string }
        refs?: { landing_page?: string }
      }>
    }
    for (const job of payload.results ?? []) {
      const location = job.locations?.map((l) => l.name).join(' · ') || 'Not specified'
      const url = job.refs?.landing_page
      if (!url) continue
      jobs.push({
        id: `muse-${job.id}`,
        title: job.name,
        company: job.company?.name || 'Unknown',
        location,
        remote: isRemoteText(location) || isRemoteText(job.name),
        url,
        source: 'The Muse',
        board: 'The Muse',
        snippet: snippet(job.contents || queryHint),
      })
    }
  }
  return jobs
}

async function fromRemotive(query: string): Promise<RawJob[]> {
  const data = (await getJson(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=30`,
  )) as {
    jobs?: Array<{
      id: number
      title: string
      company_name: string
      url: string
      candidate_required_location?: string
      description?: string
    }>
  }
  return (data.jobs ?? []).map((job) => ({
    id: `remotive-${job.id}`,
    title: job.title,
    company: job.company_name,
    location: job.candidate_required_location || 'Remote',
    remote: true,
    url: job.url,
    source: 'Remotive',
    board: 'Remotive',
    snippet: snippet(job.description || ''),
  }))
}

async function fromArbeitnow(): Promise<RawJob[]> {
  const data = (await getJson('https://www.arbeitnow.com/api/job-board-api')) as {
    data?: Array<{
      slug: string
      title: string
      company_name: string
      location?: string
      remote?: boolean
      url: string
      description?: string
    }>
  }
  return (data.data ?? []).slice(0, 40).map((job) => {
    const location = job.location || 'Not specified'
    return {
      id: `arbeitnow-${job.slug}`,
      title: job.title,
      company: job.company_name,
      location,
      remote: Boolean(job.remote) || isRemoteText(location),
      url: job.url,
      source: 'Arbeitnow',
      board: 'Arbeitnow',
      snippet: snippet(job.description || ''),
    }
  })
}

async function fromJobicy(query: string): Promise<RawJob[]> {
  const data = (await getJson(
    `https://jobicy.com/api/v2/remote-jobs?count=20&tag=${encodeURIComponent(query.split(' ')[0] || 'dev')}`,
  )) as {
    jobs?: Array<{
      id: number
      jobTitle: string
      companyName: string
      jobGeo?: string
      url: string
      jobExcerpt?: string
    }>
  }
  return (data.jobs ?? []).map((job) => ({
    id: `jobicy-${job.id}`,
    title: job.jobTitle,
    company: job.companyName,
    location: job.jobGeo || 'Remote',
    remote: true,
    url: job.url,
    source: 'Jobicy',
    board: 'Jobicy',
    snippet: snippet(job.jobExcerpt || ''),
  }))
}

const GREENHOUSE_BOARDS = [
  'stripe',
  'datadog',
  'cloudflare',
  'discord',
  'airbnb',
  'hubspot',
  'dropbox',
  'reddit',
  'mongodb',
  'figma',
]

const NON_ENGINEERING_TITLE =
  /\b(product marketing|marketing|account executive|\bsales\b|recruiter|recruiting|counsel|attorney|\bgtm\b|program manager|product manager|project manager|strategist|partnerships?|business development|finance|accountant|designer|copywriter|\bbrand\b|community|customer success|solutions architect|technical program manager|\btpm\b|operations|advisory|compliance|people operations|\bhr\b|talent|legal|policy|enablement|success manager|account manager)\b/i

const ENGINEERING_TITLE =
  /\b(software engineer|\bswe\b|developer|front[- ]?end|back[- ]?end|full[- ]?stack|site reliability|\bsre\b|devops|platform engineer|infrastructure engineer|data engineer|machine learning engineer|\bml engineer\b|ios engineer|android engineer|mobile engineer|security engineer|systems engineer|staff engineer|principal engineer|distinguished engineer|research engineer|web engineer|firmware)\b/i

const GENERIC_SOFTWARE_TITLE =
  /\b(software engineer|\bswe\b|full[- ]?stack|front[- ]?end|back[- ]?end|web developer|web engineer)\b/i

function titleMatchesStack(title: string, skills: string[], languages: string[]): boolean {
  const hay = title.toLowerCase()
  for (const skill of [...skills, ...languages]) {
    const key = skill.toLowerCase().trim()
    if (!key) continue
    if (key === 'go' && /\b(?:golang|go)\b/i.test(hay)) return true
    if (key === 'node.js' && /\bnode(?:\.js)?\b/i.test(hay)) return true
    if (key === 'javascript' && /\bjavascript\b|\bjs\b/i.test(hay)) return true
    if (key === 'typescript' && /\btypescript\b|\bts\b/i.test(hay)) return true
    if (key === 'java' && /\bjava\b/i.test(hay) && !/javascript/.test(hay)) return true
    if (key === 'c#' && /c#|c-sharp|csharp/i.test(hay)) return true
    if (key.length >= 3 && key !== 'java' && hay.includes(key)) return true
  }
  return GENERIC_SOFTWARE_TITLE.test(hay)
}

function isRelevantEngineeringJob(title: string, skills: string[], languages: string[]): boolean {
  if (NON_ENGINEERING_TITLE.test(title)) return false
  if (!ENGINEERING_TITLE.test(title)) return false
  return titleMatchesStack(title, skills, languages)
}

async function fromGreenhouse(skills: string[], languages: string[]): Promise<RawJob[]> {
  const results = await Promise.allSettled(
    GREENHOUSE_BOARDS.map(async (board) => {
      const data = (await getJson(
        `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`,
      )) as {
        jobs?: Array<{
          id: number
          title: string
          absolute_url: string
          location?: { name?: string }
        }>
      }
      return (data.jobs ?? [])
        .filter((job) => isRelevantEngineeringJob(job.title, skills, languages))
        .map((job) => {
          const location = job.location?.name || 'Not specified'
          return {
            id: `gh-${board}-${job.id}`,
            title: job.title,
            company: board.charAt(0).toUpperCase() + board.slice(1),
            location,
            remote: isRemoteText(location) || isRemoteText(job.title),
            url: job.absolute_url,
            source: 'Greenhouse',
            board: `${board} careers`,
            snippet: `${job.title} at ${board}`,
          } satisfies RawJob
        })
    }),
  )
  return results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
}

async function fromAdzuna(query: string, workMode: WorkMode): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  const country = process.env.ADZUNA_COUNTRY || 'us'
  if (!appId || !appKey) return []
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: '25',
    what: query,
    'content-type': 'application/json',
  })
  if (workMode === 'remote') params.set('what', `${query} remote`)
  const data = (await getJson(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
  )) as {
    results?: Array<{
      id: string
      title: string
      company?: { display_name?: string }
      location?: { display_name?: string }
      redirect_url?: string
      description?: string
    }>
  }
  return (data.results ?? []).map((job) => {
    const location = job.location?.display_name || 'Not specified'
    return {
      id: `adzuna-${job.id}`,
      title: job.title,
      company: job.company?.display_name || 'Unknown',
      location,
      remote: isRemoteText(location) || isRemoteText(job.title),
      url: job.redirect_url || '',
      source: 'Adzuna',
      board: 'Adzuna',
      snippet: snippet(job.description || ''),
    }
  }).filter((job) => job.url)
}

async function fromJSearch(
  skills: string[],
  languages: string[],
  workMode: WorkMode,
  address: string,
  range: { start: number; count: number; pages: number },
): Promise<RawJob[]> {
  const key = process.env.RAPIDAPI_KEY?.trim()
  if (!key) return []

  const searches = jsearchQueries(skills, languages, workMode, address).slice(
    range.start,
    range.start + range.count,
  )
  const collected: RawJob[] = []

  for (const [index, search] of searches.entries()) {
    if (index > 0) await sleep(600)
    try {
      const jobs = await fetchJSearchPage(search, key, workMode, range.pages)
      const publishers: Record<string, number> = {}
      for (const job of jobs) {
        publishers[job.board] = (publishers[job.board] || 0) + 1
      }
      console.log(`[JSearch] query="${search}" pages=${range.pages} jobs=${jobs.length}`, publishers)
      collected.push(...jobs)
    } catch (error) {
      console.warn(`JSearch request failed for "${search}":`, error)
    }
  }

  return collected
}

type JSearchHit = {
  job_id: string
  job_title: string
  employer_name: string
  job_city?: string
  job_state?: string
  job_country?: string
  job_is_remote?: boolean
  job_apply_link?: string
  job_google_link?: string
  job_description?: string
  job_publisher?: string
  job_location?: string | { city?: string; state?: string; country?: string }
  apply_options?: Array<{ publisher?: string; apply_link?: string }>
}

function jsearchLocation(job: JSearchHit): string {
  if (typeof job.job_location === 'string' && job.job_location.trim()) return job.job_location
  if (job.job_location && typeof job.job_location === 'object') {
    const nested = [job.job_location.city, job.job_location.state, job.job_location.country]
      .filter(Boolean)
      .join(', ')
    if (nested) return nested
  }
  return [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ')
}

function jsearchHits(payload: unknown): JSearchHit[] {
  if (!payload || typeof payload !== 'object') return []
  const body = payload as { data?: unknown }
  const data = body.data
  if (Array.isArray(data)) return data as JSearchHit[]
  if (data && typeof data === 'object' && Array.isArray((data as { jobs?: unknown }).jobs)) {
    return (data as { jobs: JSearchHit[] }).jobs
  }
  return []
}

async function fetchJSearchPage(
  search: string,
  key: string,
  workMode: WorkMode,
  pages: number,
): Promise<RawJob[]> {
  const params = new URLSearchParams({
    query: search,
    num_pages: String(pages),
    country: 'us',
    date_posted: 'all',
    exclude_job_publishers: EXCLUDED_PUBLISHERS.join(','),
  })
  if (workMode === 'remote') params.set('work_from_home', 'true')

  const res = await fetch(`https://jsearch.p.rapidapi.com/search-v2?${params}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
    signal: AbortSignal.timeout(pages > 1 ? 45000 : 20000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`JSearch ${res.status}${body ? `: ${body.slice(0, 180)}` : ''}`)
  }

  const payload = (await res.json()) as {
    status?: string
    message?: string
    error?: { message?: string }
    data?: unknown
  }
  if (payload.status && payload.status !== 'OK') {
    throw new Error(
      payload.error?.message || payload.message || `JSearch status ${payload.status}`,
    )
  }

  return jsearchHits(payload).map((job) => {
    const location = jsearchLocation(job)
    const { url, board } = pickJSearchLink(job)
    return {
      id: `jsearch-${job.job_id}`,
      title: job.job_title,
      company: job.employer_name,
      location: location || (job.job_is_remote ? 'Remote' : 'Not specified'),
      remote:
        Boolean(job.job_is_remote) ||
        isRemoteText(location) ||
        isRemoteText(job.job_title) ||
        isRemoteText(job.job_description || ''),
      url,
      source: 'JSearch',
      board,
      snippet: snippet(job.job_description || ''),
    }
  }).filter((job) => job.url)
}

function publisherRank(value: string): number {
  const hay = value.toLowerCase()
  if (hay.includes('indeed')) return 3
  if (hay.includes('ziprecruiter') || hay.includes('zip recruiter')) return 2
  if (hay.includes('linkedin')) return 1
  return 0
}

function boardNameFrom(value: string, fallback?: string): string {
  const hay = value.toLowerCase()
  if (hay.includes('indeed')) return 'Indeed'
  if (hay.includes('ziprecruiter') || hay.includes('zip recruiter')) return 'ZipRecruiter'
  if (hay.includes('linkedin')) return 'LinkedIn'
  return fallback || 'Google for Jobs'
}

function pickJSearchLink(job: JSearchHit): { url: string; board: string } {
  const candidates: Array<{ url: string; label: string }> = []
  for (const option of job.apply_options ?? []) {
    if (option.apply_link) {
      candidates.push({
        url: option.apply_link,
        label: `${option.publisher ?? ''} ${option.apply_link}`,
      })
    }
  }
  if (job.job_apply_link) {
    candidates.push({
      url: job.job_apply_link,
      label: `${job.job_publisher ?? ''} ${job.job_apply_link}`,
    })
  }
  candidates.sort(
    (a, b) => publisherRank(b.label) - publisherRank(a.label),
  )
  const best = candidates[0]
  const url = best?.url || job.job_google_link || ''
  const board = boardNameFrom(
    `${best?.label ?? ''} ${job.job_publisher ?? ''} ${url}`,
    job.job_publisher,
  )
  return { url, board }
}

function matchesMode(job: RawJob, workMode: WorkMode): boolean {
  if (workMode === 'remote') return job.remote
  if (workMode === 'in-person') return !job.remote
  return true
}

function boardPriority(job: RawJob): number {
  const hay = `${job.board} ${job.url}`.toLowerCase()
  const rank = publisherRank(hay)
  if (rank) return rank + 1
  if (job.source === 'JSearch') return 1
  return 0
}

function dedupe(jobs: RawJob[]): RawJob[] {
  const byKey = new Map<string, RawJob>()
  for (const job of jobs) {
    const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`
    const existing = byKey.get(key)
    if (!existing || boardPriority(job) > boardPriority(existing)) {
      byKey.set(key, job)
    }
  }
  return [...byKey.values()]
}

export const PAGE_SIZE = 40

type SearchCache = {
  jobs: JobListing[]
  jsearchNext: number
  queryCount: number
}

const searchCache = new Map<string, SearchCache>()

function searchCacheKey(request: SearchRequest): string {
  return JSON.stringify({
    skills: request.skills,
    languages: request.languages,
    workMode: request.workMode,
    address: request.address.trim(),
    maxCommuteMiles: request.maxCommuteMiles,
  })
}

function rankJobs(jobs: RawJob[], skills: string[], languages: string[]): JobListing[] {
  return dedupe(jobs)
    .map((job) => ({
      ...job,
      score: scoreJob(job, skills, languages),
    }))
    .sort((a, b) => b.score - a.score)
}

async function gatherJobs(
  request: SearchRequest,
  jsearch: { start: number; count: number; pages: number },
): Promise<RawJob[]> {
  const query = queryFromSkills(request.skills, request.languages)
  const inPersonOnly = request.workMode === 'in-person'
  const tasks: Array<Promise<RawJob[]>> = [
    fromJSearch(
      request.skills,
      request.languages,
      request.workMode,
      request.address,
      jsearch,
    ),
  ]
  if (jsearch.start === 0) {
    tasks.push(
      fromMuse(query),
      fromArbeitnow(),
      fromGreenhouse(request.skills, request.languages),
      fromAdzuna(query, request.workMode),
    )
    if (!inPersonOnly) tasks.push(fromRemotive(query), fromJobicy(query))
  }
  const settled = await Promise.allSettled(tasks)
  return settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
}

export async function searchJobs(request: SearchRequest): Promise<SearchPage> {
  const page = Math.max(1, request.page ?? 1)
  const key = searchCacheKey(request)
  const queryCount = jsearchQueries(
    request.skills,
    request.languages,
    request.workMode,
    request.address,
  ).length

  if (page === 1) {
    const raw = await gatherJobs(request, { start: 0, count: 1, pages: 1 })
    const jobs = rankJobs(
      raw.filter((job) => matchesMode(job, request.workMode) && matchesRegion(job)),
      request.skills,
      request.languages,
    )
    searchCache.set(key, { jobs, jsearchNext: 1, queryCount })
  } else {
    let cached = searchCache.get(key)
    if (!cached) {
      await searchJobs({ ...request, page: 1 })
      cached = searchCache.get(key)
    }
    if (cached) {
      const needed = page * PAGE_SIZE
      while (cached.jobs.length < needed && cached.jsearchNext < cached.queryCount) {
        const extra = await gatherJobs(request, {
          start: cached.jsearchNext,
          count: 1,
          pages: 1,
        })
        const seen = new Set(
          cached.jobs.map((job) => `${job.company.toLowerCase()}::${job.title.toLowerCase()}`),
        )
        const newcomers = rankJobs(
          extra.filter(
            (job) =>
              matchesMode(job, request.workMode) &&
              matchesRegion(job) &&
              !seen.has(`${job.company.toLowerCase()}::${job.title.toLowerCase()}`),
          ),
          request.skills,
          request.languages,
        )
        cached.jobs.push(...newcomers)
        cached.jsearchNext += 1
      }
    }
  }

  const cached = searchCache.get(key)
  if (!cached) {
    return { jobs: [], hasMore: false, total: 0, page }
  }
  const start = (page - 1) * PAGE_SIZE
  const jobs = cached.jobs.slice(start, start + PAGE_SIZE)
  const hasMore =
    start + jobs.length < cached.jobs.length || cached.jsearchNext < cached.queryCount
  return { jobs, hasMore, total: cached.jobs.length, page }
}
