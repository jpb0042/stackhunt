import {
  extractFromFile,
  mergeLists,
  uniq,
} from '../shared/skills'
import type { RepoProfile } from '../shared/types'

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.trim().match(/github\.com\/([^/]+)\/([^/#?]+)/i)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

async function githubJson(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      'User-Agent': 'Stackhunt/0.1',
      Accept: 'application/vnd.github+json',
    },
    signal: AbortSignal.timeout(8000),
  })
}

export async function profileGithubRepo(url: string): Promise<RepoProfile> {
  const parsed = parseGithubUrl(url)
  if (!parsed) {
    throw new Error('Paste a GitHub repo URL like https://github.com/owner/repo')
  }
  const { owner, repo } = parsed
  const base = `https://api.github.com/repos/${owner}/${repo}`

  const [langRes, pkgRes, readmeRes, goRes, pyRes] = await Promise.all([
    githubJson(`${base}/languages`),
    githubJson(`${base}/contents/package.json`),
    fetch(`${base}/readme`, {
      headers: {
        'User-Agent': 'Stackhunt/0.1',
        Accept: 'application/vnd.github.raw',
      },
      signal: AbortSignal.timeout(8000),
    }),
    githubJson(`${base}/contents/go.mod`),
    githubJson(`${base}/contents/pyproject.toml`),
  ])

  if (langRes.status === 404) {
    throw new Error('GitHub repo not found (is it public?)')
  }

  const languages = langRes.ok
    ? uniq(Object.keys((await langRes.json()) as Record<string, number>))
    : []

  const files: Array<{ name: string; raw: string }> = []
  for (const [name, res] of [
    ['package.json', pkgRes],
    ['go.mod', goRes],
    ['pyproject.toml', pyRes],
  ] as const) {
    if (!res.ok) continue
    const body = (await res.json()) as { content?: string; encoding?: string }
    if (body.content) {
      files.push({ name, raw: Buffer.from(body.content, 'base64').toString('utf8') })
    }
  }
  if (readmeRes.ok) {
    files.push({ name: 'README.md', raw: await readmeRes.text() })
  }

  let skills: string[] = []
  for (const file of files) {
    const extracted = extractFromFile(file.name, file.raw)
    skills = mergeLists(skills, extracted.skills)
  }

  return {
    name: `${owner}/${repo}`,
    source: 'github',
    languages,
    skills: mergeLists(skills, languages),
    filesScanned: files.length + (langRes.ok ? 1 : 0),
  }
}
