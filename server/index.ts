import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { attachCommute } from './commute'
import { profileGithubRepo } from './github'
import { searchJobs, PAGE_SIZE } from './jobs'
import { resolvePlace, suggestPlaces } from './places'
import type { SearchRequest } from '../shared/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.post('/api/jobs/search', async (req, res) => {
  const body = req.body as SearchRequest
  const workMode = body.workMode
  const address = (body.address ?? '').trim()
  const skills = Array.isArray(body.skills) ? body.skills : []
  const languages = Array.isArray(body.languages) ? body.languages : []
  const maxCommuteMiles = Number(body.maxCommuteMiles) || 30

  if (workMode !== 'remote') {
    const originLat = Number(body.originLat)
    const originLon = Number(body.originLon)
    if (!address) {
      res.status(400).json({ error: 'Address is required for in-person jobs so we can show commute distance.' })
      return
    }
    if (!Number.isFinite(originLat) || !Number.isFinite(originLon)) {
      res.status(400).json({ error: 'Select an address from the suggestions so we can estimate commute.' })
      return
    }
  }

  try {
    const result = await searchJobs({
      skills,
      languages,
      workMode,
      address,
      maxCommuteMiles,
      page: Number(body.page) || 1,
    })
    const withCommute = await attachCommute(
      result.jobs,
      address,
      workMode,
      maxCommuteMiles,
      Number.isFinite(Number(body.originLat)) ? Number(body.originLat) : undefined,
      Number.isFinite(Number(body.originLon)) ? Number(body.originLon) : undefined,
    )
    res.json({
      jobs: withCommute,
      hasMore: result.hasMore && withCommute.length >= PAGE_SIZE,
      total: result.total,
      page: result.page,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed'
    res.status(500).json({ error: message })
  }
})

app.get('/api/places/suggest', async (req, res) => {
  const q = String(req.query.q ?? '')
  const session = String(req.query.session ?? '')
  try {
    res.json({ places: await suggestPlaces(q, session || undefined) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Address lookup failed'
    res.status(502).json({ error: message })
  }
})

app.get('/api/places/details', async (req, res) => {
  const id = String(req.query.id ?? '')
  const session = String(req.query.session ?? '')
  try {
    res.json({ place: await resolvePlace(id, session || undefined) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Address lookup failed'
    res.status(400).json({ error: message })
  }
})

app.post('/api/github/profile', async (req, res) => {
  const url = String((req.body as { url?: string }).url ?? '')
  try {
    const repo = await profileGithubRepo(url)
    res.json({ repo })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read that repo'
    res.status(400).json({ error: message })
  }
})

if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(__dirname, '../dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'))
  })
}

const port = Number(process.env.PORT) || 3001
app.listen(port, () => {
  console.log(`Stackhunt API on http://127.0.0.1:${port}`)
})
