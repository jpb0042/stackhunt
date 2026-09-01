export type WorkMode = 'remote' | 'in-person' | 'both'

export type RepoProfile = {
  name: string
  source: 'folder' | 'github'
  languages: string[]
  skills: string[]
  filesScanned: number
}

export type SkillProfile = {
  repos: RepoProfile[]
  skills: string[]
  languages: string[]
}

export type JobListing = {
  id: string
  title: string
  company: string
  location: string
  remote: boolean
  url: string
  source: string
  board: string
  snippet: string
  score: number
  commuteMiles?: number | null
  commuteMinutes?: number | null
  commuteLabel?: string | null
}

export type PlaceSuggestion = {
  id: string
  label: string
  lat?: number
  lon?: number
}

export type SearchRequest = {
  skills: string[]
  languages: string[]
  workMode: WorkMode
  address: string
  originLat?: number
  originLon?: number
  maxCommuteMiles: number
  page?: number
}

export type SearchPage = {
  jobs: JobListing[]
  hasMore: boolean
  total: number
  page: number
}
