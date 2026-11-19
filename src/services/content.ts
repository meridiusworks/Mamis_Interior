/**
 * Content access layer.
 *
 * Every page reads content through these async functions, never by importing
 * JSON directly. Today they resolve local files bundled with the app; to move
 * to a CMS or REST API, replace the body of `load()` (or individual functions)
 * with `fetch()` calls that return the same types — no UI changes required.
 */
import type {
  Article,
  Material,
  MaterialPalette,
  PressItem,
  ProcessStep,
  Project,
  Service,
  TeamMember,
  Testimonial,
  Transformation,
} from '../types/content'

interface StudioData {
  team: TeamMember[]
  principles: { title: string; text: string }[]
  process: ProcessStep[]
  history: { year: string; text: string }[]
  testimonials: Testimonial[]
  press: PressItem[]
}

const sources = {
  projects: () => import('../data/projects.json').then((m) => m.default as Project[]),
  services: () => import('../data/services.json').then((m) => m.default as Service[]),
  articles: () => import('../data/articles.json').then((m) => m.default as Article[]),
  materials: () =>
    import('../data/materials.json').then(
      (m) => m.default as { materials: Material[]; palettes: MaterialPalette[] },
    ),
  transformations: () => import('../data/transformations.json').then((m) => m.default as Transformation[]),
  studio: () => import('../data/studio.json').then((m) => m.default as StudioData),
}

type Sources = typeof sources
const cache = new Map<keyof Sources, Promise<unknown>>()

function load<K extends keyof Sources>(key: K): ReturnType<Sources[K]> {
  if (!cache.has(key)) cache.set(key, sources[key]())
  return cache.get(key) as ReturnType<Sources[K]>
}

export async function getProjects(): Promise<Project[]> {
  const projects = await load('projects')
  return [...projects].sort((a, b) => b.year - a.year)
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await load('projects')).find((p) => p.slug === slug)
}

/** Previous / next in portfolio order, wrapping around. */
export async function getAdjacentProjects(slug: string) {
  const list = await getProjects()
  const i = list.findIndex((p) => p.slug === slug)
  if (i < 0) return { previous: undefined, next: undefined }
  return { previous: list[(i - 1 + list.length) % list.length], next: list[(i + 1) % list.length] }
}

export async function getRelatedProjects(project: Project, limit = 3): Promise<Project[]> {
  const list = await getProjects()
  return list
    .filter((p) => p.slug !== project.slug)
    .map((p) => ({ p, score: p.categories.filter((c) => project.categories.includes(c)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p)
}

export async function getServices(): Promise<Service[]> {
  return load('services')
}

export async function getArticles(): Promise<Article[]> {
  const articles = await load('articles')
  return [...articles].sort((a, b) => b.date.localeCompare(a.date))
}

export async function getArticle(slug: string): Promise<Article | undefined> {
  return (await load('articles')).find((a) => a.slug === slug)
}

export async function getRelatedArticles(article: Article, limit = 3): Promise<Article[]> {
  const list = await getArticles()
  return list
    .filter((a) => a.slug !== article.slug)
    .map((a) => ({
      a,
      score: (a.category === article.category ? 2 : 0) + a.tags.filter((t) => article.tags.includes(t)).length,
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map(({ a }) => a)
}

/** Case-insensitive search over title, dek, tags and body text; every term must match. */
export function searchArticles(articles: Article[], query: string): Article[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return articles
  return articles.filter((a) => {
    const haystack = [
      a.title,
      a.dek,
      a.category,
      a.author,
      ...a.tags,
      ...a.body.map((b) => (b.type === 'image' ? (b.image.caption ?? '') : b.text)),
    ]
      .join(' ')
      .toLowerCase()
    return terms.every((t) => haystack.includes(t))
  })
}

export async function getMaterials() {
  return load('materials')
}

export async function getTransformations(): Promise<Transformation[]> {
  return load('transformations')
}

export async function getStudio(): Promise<StudioData> {
  return load('studio')
}
