import 'dotenv/config'

const key = process.env.RAPIDAPI_KEY?.trim()
if (!key) {
  console.error('RAPIDAPI_KEY is missing. Add it to .env and retry.')
  process.exit(1)
}

const query = process.argv.slice(2).join(' ') || 'developer jobs in chicago'
const params = new URLSearchParams({
  query,
  num_pages: '1',
  country: 'us',
  date_posted: 'all',
})

const url = `https://jsearch.p.rapidapi.com/search-v2?${params}`
const res = await fetch(url, {
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': key,
    'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
  },
})

const body = await res.json()
const jobs = Array.isArray(body.data) ? body.data : body.data?.jobs ?? []
const publishers = {}
for (const job of jobs) {
  const name = job.job_publisher || '(none)'
  publishers[name] = (publishers[name] || 0) + 1
}

console.log(`HTTP ${res.status}  JSearch status=${body.status ?? 'n/a'}  jobs=${jobs.length}`)
console.log(`query: ${query}`)
console.log('publishers:', publishers)
console.log(
  'sample:',
  jobs.slice(0, 8).map((job) => `${job.job_publisher}: ${job.job_title} @ ${job.employer_name}`),
)
if (body.message || body.error) {
  console.log('error:', body.message || body.error)
}
