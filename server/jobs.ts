import type { JobListing, SearchRequest, WorkMode } from '../shared/types'
import { uniq } from '../shared/skills'

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
  const parts = uniq([...languages.slice(0, 2), ...skills.slice(0, 4)])
  return parts.join(' ') || 'software engineer'
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

async function fromGreenhouse(): Promise<RawJob[]> {
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
      return (data.jobs ?? []).map((job) => {
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

async function fromJSearch(query: string): Promise<RawJob[]> {
  const key = process.env.RAPIDAPI_KEY
  if (!key) return []
  const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1`
  const data = (await getJson(url, {
    'X-RapidAPI-Key': key,
    'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
  })) as {
    data?: Array<{
      job_id: string
      job_title: string
      employer_name: string
      job_city?: string
      job_state?: string
      job_country?: string
      job_is_remote?: boolean
      job_apply_link?: string
      job_description?: string
      job_publisher?: string
    }>
  }
  return (data.data ?? []).map((job) => {
    const location = [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ')
    return {
      id: `jsearch-${job.job_id}`,
      title: job.job_title,
      company: job.employer_name,
      location: location || (job.job_is_remote ? 'Remote' : 'Not specified'),
      remote: Boolean(job.job_is_remote) || isRemoteText(location),
      url: job.job_apply_link || '',
      source: job.job_publisher || 'Google for Jobs',
      board: job.job_publisher || 'Google for Jobs',
      snippet: snippet(job.job_description || ''),
    }
  }).filter((job) => job.url)
}

function matchesMode(job: RawJob, workMode: WorkMode): boolean {
  if (workMode === 'remote') return job.remote
  if (workMode === 'in-person') return !job.remote
  return true
}

function dedupe(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>()
  const out: RawJob[] = []
  for (const job of jobs) {
    const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(job)
  }
  return out
}

export async function searchJobs(request: SearchRequest): Promise<JobListing[]> {
  const query = queryFromSkills(request.skills, request.languages)
  const inPersonOnly = request.workMode === 'in-person'

  const tasks: Array<Promise<RawJob[]>> = [
    fromMuse(query),
    fromArbeitnow(),
    fromGreenhouse(),
    fromAdzuna(query, request.workMode),
    fromJSearch(query),
  ]
  if (!inPersonOnly) {
    tasks.push(fromRemotive(query), fromJobicy(query))
  }

  const settled = await Promise.allSettled(tasks)
  const merged = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  const filtered = dedupe(merged).filter((job) => matchesMode(job, request.workMode))

  return filtered
    .map((job) => ({
      ...job,
      score: scoreJob(job, request.skills, request.languages),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
}
