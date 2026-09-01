import {
  extractFromFile,
  mergeLists,
  shouldSkipDir,
  uniq,
} from '@shared/skills'
import type { RepoProfile } from '@shared/types'

const MAX_FILES = 120
const MAX_BYTES = 80_000

type FileRef = { path: string; file: File }

async function readDirectoryEntries(
  dir: FileSystemDirectoryEntry,
): Promise<FileSystemEntry[]> {
  const reader = dir.createReader()
  const entries: FileSystemEntry[] = []
  const readBatch = () =>
    new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject)
    })
  for (;;) {
    const batch = await readBatch()
    if (!batch.length) break
    entries.push(...batch)
  }
  return entries
}

async function walkEntry(entry: FileSystemEntry, prefix = ''): Promise<FileRef[]> {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name
  if (entry.isDirectory) {
    if (shouldSkipDir(entry.name)) return []
    const children = await readDirectoryEntries(entry as FileSystemDirectoryEntry)
    const nested = await Promise.all(children.map((child) => walkEntry(child, path)))
    return nested.flat()
  }
  if (!entry.isFile) return []
  const file = await new Promise<File>((resolve, reject) => {
    ;(entry as FileSystemFileEntry).file(resolve, reject)
  })
  return [{ path, file }]
}

async function walkHandle(
  handle: FileSystemDirectoryHandle,
  prefix = '',
): Promise<FileRef[]> {
  const out: FileRef[] = []
  for await (const entry of handle.values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.kind === 'directory') {
      if (shouldSkipDir(entry.name)) continue
      out.push(...(await walkHandle(entry, path)))
    } else {
      out.push({ path, file: await entry.getFile() })
    }
  }
  return out
}

const MANIFEST_NAMES = new Set([
  'package.json',
  'pyproject.toml',
  'requirements.txt',
  'pipfile',
  'go.mod',
  'cargo.toml',
  'gemfile',
  'composer.json',
  'mix.exs',
  'pubspec.yaml',
  'dockerfile',
  'readme.md',
  'readme',
  'readme.txt',
])

async function profileFiles(name: string, files: FileRef[]): Promise<RepoProfile> {
  let skills: string[] = []
  let languages: string[] = []
  let scanned = 0

  for (const ref of files) {
    const fileName = (ref.path.split('/').pop() || ref.file.name).toLowerCase()
    const extractedName = extractFromFile(fileName, '')
    languages = mergeLists(languages, extractedName.languages)
  }

  const manifests = files.filter((ref) => {
    const fileName = (ref.path.split('/').pop() || ref.file.name).toLowerCase()
    return MANIFEST_NAMES.has(fileName) || fileName.endsWith('.csproj')
  }).slice(0, MAX_FILES)

  for (const ref of manifests) {
    if (ref.file.size > MAX_BYTES) continue
    const text = await ref.file.text()
    const fileName = ref.path.split('/').pop() || ref.file.name
    const extracted = extractFromFile(fileName, text)
    skills = mergeLists(skills, extracted.skills)
    languages = mergeLists(languages, extracted.languages)
    scanned += 1
  }

  return {
    name,
    source: 'folder',
    languages: uniq(languages),
    skills: uniq(skills),
    filesScanned: scanned,
  }
}

export async function profileDroppedItems(items: DataTransferItemList): Promise<RepoProfile[]> {
  const entries: FileSystemEntry[] = []
  for (const item of items) {
    const entry = item.webkitGetAsEntry?.()
    if (entry) entries.push(entry)
  }
  const repos: RepoProfile[] = []
  for (const entry of entries) {
    if (entry.isDirectory) {
      const files = await walkEntry(entry)
      repos.push(await profileFiles(entry.name, files))
    } else if (entry.isFile) {
      const files = await walkEntry(entry)
      repos.push(await profileFiles(entry.name.replace(/\.[^.]+$/, ''), files))
    }
  }
  return repos
}

export async function profileDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<RepoProfile> {
  const files = await walkHandle(handle)
  return profileFiles(handle.name, files)
}
