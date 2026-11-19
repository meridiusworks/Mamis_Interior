/** A rendered image from public/images. `src` is the path without extension. */
export interface ImageRef {
  src: string
  alt: string
  /** Width / height, used to reserve layout space. */
  ratio?: number
  caption?: string
}

export type ProjectCategory =
  | 'Residential'
  | 'Commercial'
  | 'Hospitality'
  | 'Interior Design'
  | 'Renovation'
  | 'Architecture'

export interface ProjectSpec {
  label: string
  value: string
}

export interface ProjectDrawing extends ImageRef {
  title: string
}

export interface BeforeAfterPair {
  id: string
  title: string
  before: ImageRef
  after: ImageRef
  description: string
}

export interface Project {
  slug: string
  title: string
  subtitle: string
  categories: ProjectCategory[]
  type: string
  location: string
  year: number
  status: string
  featured: boolean
  cover: ImageRef
  excerpt: string
  concept: string
  narrative: string[]
  specs: ProjectSpec[]
  gallery: ImageRef[]
  drawings: ProjectDrawing[]
  materials: string[]
  transformations: string[]
  has3d: boolean
  services: string[]
}

export interface Service {
  slug: string
  number: string
  title: string
  short: string
  description: string
  deliverables: string[]
  process: { title: string; text: string }[]
  image: ImageRef
  projects: string[]
}

export type ArticleBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'image'; image: ImageRef }

export interface Article {
  slug: string
  title: string
  dek: string
  category: string
  date: string
  author: string
  readingMinutes: number
  featured: boolean
  cover: ImageRef
  tags: string[]
  body: ArticleBlock[]
}

export type MaterialCategory =
  | 'Natural Stone'
  | 'Marble'
  | 'Travertine'
  | 'Wood'
  | 'Concrete'
  | 'Metal'
  | 'Glass'
  | 'Ceramic'
  | 'Fabrics'
  | 'Paint & Wall Finishes'

export interface Material {
  slug: string
  name: string
  category: MaterialCategory
  description: string
  finish: string
  applications: string[]
  care: string
  /** Base name of a texture in public/textures (without .jpg). */
  texture?: string
  normal?: string
  color: string
  roughness: number
  metalness: number
  /** Repeats across the 3D preview object. */
  repeat: number
  transmission?: number
}

export interface MaterialPalette {
  slug: string
  name: string
  mood: string
  materials: string[]
}

export interface Testimonial {
  id: string
  quote: string
  attribution: string
  context: string
}

export interface PressItem {
  id: string
  kind: 'Award' | 'Publication' | 'Interview' | 'Exhibition'
  title: string
  outlet: string
  date: string
  summary: string
  project?: string
  /** Internal route when a companion article exists on this site. */
  link?: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  bio: string
  initials: string
}

export interface Transformation extends BeforeAfterPair {
  project: string
  category: string
}

export interface ProcessStep {
  number: string
  title: string
  duration: string
  text: string
}
