const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.turbo',
  '.cache',
  'out',
  'vendor',
  'target',
  '__pycache__',
  '.venv',
  'venv',
  '.idea',
  '.vscode',
])

const INTERESTING_FILES = new Set([
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

const EXT_LANGUAGE: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.swift': 'Swift',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.scala': 'Scala',
  '.ex': 'Elixir',
  '.exs': 'Elixir',
  '.dart': 'Dart',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
}

const PACKAGE_SKILLS: Record<string, string> = {
  react: 'React',
  'react-dom': 'React',
  next: 'Next.js',
  vue: 'Vue',
  nuxt: 'Nuxt',
  svelte: 'Svelte',
  angular: 'Angular',
  express: 'Express',
  fastify: 'Fastify',
  nestjs: 'NestJS',
  '@nestjs/core': 'NestJS',
  hono: 'Hono',
  koa: 'Koa',
  graphql: 'GraphQL',
  prisma: 'Prisma',
  drizzle: 'Drizzle',
  sequelize: 'Sequelize',
  mongoose: 'MongoDB',
  mongodb: 'MongoDB',
  pg: 'PostgreSQL',
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  redis: 'Redis',
  tailwindcss: 'Tailwind CSS',
  '@mui/material': 'Material UI',
  vite: 'Vite',
  webpack: 'Webpack',
  typescript: 'TypeScript',
  redux: 'Redux',
  zustand: 'Zustand',
  'react-query': 'React Query',
  '@tanstack/react-query': 'React Query',
  axios: 'REST APIs',
  firebase: 'Firebase',
  supabase: 'Supabase',
  stripe: 'Stripe',
  aws: 'AWS',
  '@aws-sdk/client-s3': 'AWS',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  electron: 'Electron',
  playwright: 'Playwright',
  jest: 'Jest',
  vitest: 'Vitest',
  cypress: 'Cypress',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  numpy: 'NumPy',
  pandas: 'Pandas',
  torch: 'PyTorch',
  tensorflow: 'TensorFlow',
  rails: 'Rails',
  laravel: 'Laravel',
  spring: 'Spring',
}

const README_HINTS: Array<[RegExp, string]> = [
  [/\breact\b/i, 'React'],
  [/\bnext\.?js\b/i, 'Next.js'],
  [/\btypescript\b/i, 'TypeScript'],
  [/\bpython\b/i, 'Python'],
  [/\bdjango\b/i, 'Django'],
  [/\bfastapi\b/i, 'FastAPI'],
  [/\bgolang\b|\bgo\b/i, 'Go'],
  [/\brust\b/i, 'Rust'],
  [/\bpostgres(ql)?\b/i, 'PostgreSQL'],
  [/\bkubernetes\b|\bk8s\b/i, 'Kubernetes'],
  [/\bdocker\b/i, 'Docker'],
  [/\baws\b/i, 'AWS'],
  [/\bgcp\b|google cloud/i, 'GCP'],
  [/\bazure\b/i, 'Azure'],
  [/\bgraphql\b/i, 'GraphQL'],
  [/\btailwind\b/i, 'Tailwind CSS'],
  [/\bnode\.?js\b/i, 'Node.js'],
]

export function shouldSkipDir(name: string): boolean {
  return SKIP_DIRS.has(name) || name.startsWith('.')
}

export function isInterestingFile(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  if (INTERESTING_FILES.has(lower)) return true
  if (lower.endsWith('.csproj')) return true
  const ext = extname(lower)
  return Boolean(EXT_LANGUAGE[ext])
}

export function languageFromFile(fileName: string): string | null {
  return EXT_LANGUAGE[extname(fileName.toLowerCase())] ?? null
}

function extname(fileName: string): string {
  const i = fileName.lastIndexOf('.')
  return i >= 0 ? fileName.slice(i) : ''
}

export function skillsFromPackageJson(raw: string): string[] {
  try {
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]
    const skills = new Set<string>()
    for (const name of names) {
      const mapped = PACKAGE_SKILLS[name] ?? PACKAGE_SKILLS[name.split('/')[0] ?? '']
      if (mapped) skills.add(mapped)
    }
    if (names.includes('typescript') || names.some((n) => n.startsWith('@types/'))) {
      skills.add('TypeScript')
    }
    return [...skills]
  } catch {
    return []
  }
}

export function skillsFromGoMod(raw: string): string[] {
  const skills = ['Go']
  if (/gin-gonic\/gin/.test(raw)) skills.push('Gin')
  if (/gorilla\/mux/.test(raw)) skills.push('Gorilla Mux')
  if (/sqlx|pgx|postgres/.test(raw)) skills.push('PostgreSQL')
  if (/aws-sdk/.test(raw)) skills.push('AWS')
  return skills
}

export function skillsFromPyProjectOrRequirements(raw: string): string[] {
  const skills = ['Python']
  const lower = raw.toLowerCase()
  for (const [needle, label] of [
    ['django', 'Django'],
    ['fastapi', 'FastAPI'],
    ['flask', 'Flask'],
    ['pandas', 'Pandas'],
    ['numpy', 'NumPy'],
    ['torch', 'PyTorch'],
    ['tensorflow', 'TensorFlow'],
    ['sqlalchemy', 'SQLAlchemy'],
    ['celery', 'Celery'],
    ['pytest', 'Pytest'],
  ] as const) {
    if (lower.includes(needle)) skills.push(label)
  }
  return skills
}

export function skillsFromCargo(raw: string): string[] {
  const skills = ['Rust']
  if (/actix-web/.test(raw)) skills.push('Actix')
  if (/axum/.test(raw)) skills.push('Axum')
  if (/tokio/.test(raw)) skills.push('Tokio')
  if (/serde/.test(raw)) skills.push('Serde')
  return skills
}

export function skillsFromReadme(raw: string): string[] {
  const slice = raw.slice(0, 8000)
  const skills: string[] = []
  for (const [re, label] of README_HINTS) {
    if (re.test(slice)) skills.push(label)
  }
  return skills
}

export function extractFromFile(fileName: string, content: string): {
  languages: string[]
  skills: string[]
} {
  const lower = fileName.toLowerCase()
  const languages: string[] = []
  const skills: string[] = []
  const lang = languageFromFile(fileName)
  if (lang) languages.push(lang)

  if (lower.endsWith('package.json')) skills.push(...skillsFromPackageJson(content))
  else if (lower.endsWith('go.mod')) skills.push(...skillsFromGoMod(content))
  else if (
    lower.endsWith('pyproject.toml') ||
    lower.endsWith('requirements.txt') ||
    lower === 'pipfile'
  ) {
    skills.push(...skillsFromPyProjectOrRequirements(content))
  } else if (lower.endsWith('cargo.toml')) skills.push(...skillsFromCargo(content))
  else if (lower.startsWith('readme')) skills.push(...skillsFromReadme(content))
  else if (lower === 'dockerfile') skills.push('Docker')
  else if (lower.endsWith('gemfile')) skills.push('Ruby', 'Rails')
  else if (lower.endsWith('composer.json')) skills.push('PHP')
  else if (lower.endsWith('.csproj')) skills.push('C#', '.NET')

  return { languages: uniq(languages), skills: uniq(skills) }
}

export function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

export function mergeLists(...lists: string[][]): string[] {
  return uniq(lists.flat())
}
