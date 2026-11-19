import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Box, Maximize2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BeforeAfter } from '../components/galleries/BeforeAfter'
import { Lightbox } from '../components/galleries/Lightbox'
import { ProjectCard } from '../components/projects/ProjectCard'
import type { LightingPreset } from '../components/three/villa'
import { Breadcrumbs, ConsultationCta, Eyebrow, PageError, PageLoading, ReadingProgress, SampleNote } from '../components/ui/Misc'
import { Picture } from '../components/ui/Picture'
import { ImageReveal, Reveal } from '../components/ui/Reveal'
import { Seo } from '../components/ui/Seo'
import { useAsync } from '../hooks/useAsync'
import { getAdjacentProjects, getMaterials, getProject, getRelatedProjects, getTransformations } from '../services/content'
import { MODELS } from '../components/three/models'
import type { ImageRef } from '../types/content'
import { hasWebGL } from '../utils/device'
import NotFound from './NotFound'

const VillaExplorer = lazy(() => import('../components/three/VillaExplorer').then((m) => ({ default: m.VillaExplorer })))

export default function ProjectDetail() {
  const { slug = '' } = useParams()
  const state = useAsync(async () => {
    const project = await getProject(slug)
    if (!project) return null
    const [adjacent, related, materials, transformations] = await Promise.all([
      getAdjacentProjects(slug),
      getRelatedProjects(project),
      getMaterials(),
      getTransformations(),
    ])
    return {
      project,
      adjacent,
      related,
      materials: project.materials.map((m) => materials.materials.find((x) => x.slug === m)).filter((m) => !!m),
      transformations: transformations.filter((t) => project.transformations.includes(t.id)),
    }
  }, [slug])
  const [lightbox, setLightbox] = useState<{ images: ImageRef[]; index: number } | null>(null)

  if (state.status === 'loading') return <PageLoading />
  if (state.status === 'error') return <PageError message={state.error.message} />
  if (!state.data) return <NotFound />

  const { project, adjacent, related, materials, transformations } = state.data
  const gallery = project.gallery
  const open = (images: ImageRef[], index: number) => setLightbox({ images, index })

  return (
    <article>
      <Seo title={project.title} description={project.excerpt} image={project.cover.src} type="article" />
      <ReadingProgress />

      {/* Cover */}
      <header className="on-dark relative h-[100svh] min-h-[600px] overflow-hidden bg-charcoal text-ivory">
        <motion.div className="absolute inset-0" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}>
          <Picture image={project.cover} fill priority sizes="100vw" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/20 to-charcoal/40" />
        <div className="relative container-wide flex h-full flex-col justify-end pt-28 pb-14">
          <Breadcrumbs tone="dark" items={[{ label: 'Projects', to: '/projects' }, { label: project.title }]} />
          <motion.h1
            className="mt-8 font-serif text-display"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {project.title}
          </motion.h1>
          <p className="mt-5 max-w-xl text-[1.1rem] text-ivory/80">{project.subtitle}</p>
          <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-6 border-t border-ivory/20 pt-6 text-[0.85rem] sm:grid-cols-4">
            {[
              ['Category', project.categories.join(', ')],
              ['Location', project.location],
              ['Year', String(project.year)],
              ['Status', project.status],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="eyebrow mb-1.5 text-stone">{k}</dt>
                <dd className="text-ivory/85">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* Concept + narrative */}
      <section className="container-wide grid gap-16 py-24 md:py-36 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Reveal>
            <Eyebrow className="mb-8 text-olive">Concept</Eyebrow>
            <p className="font-serif text-[clamp(1.9rem,3.4vw,3.1rem)] leading-[1.12]">{project.concept}</p>
          </Reveal>
          <div className="prose-editorial mt-14 max-w-2xl">
            {project.narrative.map((para, i) => (
              <Reveal key={i} delay={0.05}>
                <p>{para}</p>
              </Reveal>
            ))}
          </div>
        </div>
        <aside className="lg:col-span-4 lg:col-start-9">
          <div className="lg:sticky lg:top-28">
            <Eyebrow className="mb-6 text-olive">Overview</Eyebrow>
            <dl className="divide-y divide-charcoal/12 border-y border-charcoal/12">
              {project.specs.map((s) => (
                <div key={s.label} className="grid grid-cols-[120px_1fr] gap-4 py-4 text-[0.9rem]">
                  <dt className="text-charcoal/55">{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
            <SampleNote className="mt-6">Figures are illustrative values for a design study.</SampleNote>
          </div>
        </aside>
      </section>

      {/* Image sequence */}
      <section aria-label="Gallery" className="container-wide space-y-10 pb-24 md:space-y-16 md:pb-36">
        {gallery.map((img, i) => {
          const portrait = (img.ratio ?? 1.6) < 1
          return (
            <figure key={img.src} className={portrait ? 'md:w-[55%] ' + (i % 2 ? 'md:ml-auto' : 'md:ml-[12%]') : i % 3 === 2 ? 'md:w-[78%] md:ml-auto' : ''}>
              <button type="button" onClick={() => open(gallery, i)} className="group relative block w-full cursor-zoom-in" aria-label={`Open image: ${img.caption ?? img.alt}`}>
                <ImageReveal>
                  <Picture image={img} sizes={portrait ? '(min-width: 768px) 55vw, 100vw' : '100vw'} />
                </ImageReveal>
                <span className="absolute right-4 bottom-4 grid size-10 place-items-center rounded-full bg-ivory/90 text-charcoal opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Maximize2 aria-hidden className="size-4" />
                </span>
              </button>
              {img.caption && <figcaption className="mt-3 text-[0.82rem] text-charcoal/60">{img.caption}</figcaption>}
            </figure>
          )
        })}
      </section>

      {project.has3d && <ProjectModel />}

      {/* Drawings */}
      {project.drawings.length > 0 && (
        <section className="bg-white py-24 md:py-32">
          <div className="container-wide">
            <Eyebrow className="mb-6 text-olive">Drawings</Eyebrow>
            <h2 className="mb-12 max-w-2xl font-serif text-headline">Plans, elevations and axonometrics.</h2>
            <div className="grid gap-8 md:grid-cols-2">
              {project.drawings.map((d, i) => (
                <figure key={d.src}>
                  <button type="button" onClick={() => open(project.drawings, i)} className="block w-full cursor-zoom-in border border-charcoal/10 bg-white" aria-label={`Open drawing: ${d.title}`}>
                    <Picture image={d} sizes="(min-width: 768px) 50vw, 100vw" className="contrast-[1.25] brightness-[1.12]" />
                  </button>
                  <figcaption className="mt-3 flex justify-between text-[0.85rem]">
                    <span>{d.title}</span>
                    <span className="text-charcoal/50">Rendered from the Blender model</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Before / after */}
      {transformations.length > 0 && (
        <section className="container-wide py-24 md:py-32">
          <Eyebrow className="mb-6 text-olive">Before &amp; after</Eyebrow>
          <h2 className="mb-12 font-serif text-headline">The transformation</h2>
          <div className="space-y-16">
            {transformations.map((t) => (
              <div key={t.id} className="grid gap-8 lg:grid-cols-12">
                <BeforeAfter before={t.before} after={t.after} label={t.title} className="lg:col-span-8" />
                <div className="lg:col-span-4">
                  <h3 className="font-serif text-title">{t.title}</h3>
                  <p className="mt-4 text-charcoal/70">{t.description}</p>
                  <SampleNote className="mt-6">Visualisation study from identical Blender cameras — not photographs of a completed project.</SampleNote>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Materials */}
      <section className="border-t border-charcoal/10 bg-ivory-deep py-24">
        <div className="container-wide">
          <Eyebrow className="mb-6 text-olive">Materials &amp; finishes</Eyebrow>
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {materials.map((m) => (
              <li key={m.slug}>
                <Link to={`/materials?material=${m.slug}`} className="group block">
                  <span
                    className="block aspect-square bg-cover bg-center transition-transform duration-700 group-hover:scale-[0.97]"
                    style={{ backgroundColor: m.color, backgroundImage: m.texture ? `url(/textures/${m.texture}.jpg)` : undefined }}
                    aria-hidden
                  />
                  <span className="mt-3 block text-[0.92rem]">{m.name}</span>
                  <span className="block text-[0.75rem] text-charcoal/55">{m.category}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Previous / next */}
      <nav aria-label="Project navigation" className="container-wide grid border-b border-charcoal/10 sm:grid-cols-2">
        {adjacent.previous && (
          <Link to={`/projects/${adjacent.previous.slug}`} className="group flex items-center gap-5 border-charcoal/10 py-12 sm:border-r sm:pr-8">
            <ArrowLeft aria-hidden className="size-5 transition-transform group-hover:-translate-x-1" />
            <span>
              <span className="eyebrow block text-charcoal/50">Previous project</span>
              <span className="mt-2 block font-serif text-[2rem]">{adjacent.previous.title}</span>
            </span>
          </Link>
        )}
        {adjacent.next && (
          <Link to={`/projects/${adjacent.next.slug}`} className="group flex items-center justify-end gap-5 py-12 text-right sm:pl-8">
            <span>
              <span className="eyebrow block text-charcoal/50">Next project</span>
              <span className="mt-2 block font-serif text-[2rem]">{adjacent.next.title}</span>
            </span>
            <ArrowRight aria-hidden className="size-5 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </nav>

      <section className="container-wide py-24">
        <h2 className="mb-12 font-serif text-title">Related projects</h2>
        <div className="grid gap-10 md:grid-cols-3">
          {related.map((p) => (
            <ProjectCard key={p.slug} project={p} imageClassName="aspect-[4/3]" sizes="(min-width: 768px) 33vw, 100vw" />
          ))}
        </div>
      </section>

      <ConsultationCta title={`Planning something like ${project.title}?`} />

      <Lightbox
        images={lightbox?.images ?? []}
        index={lightbox?.index ?? null}
        onIndexChange={(index) => setLightbox((l) => (l ? { ...l, index } : l))}
        onClose={() => setLightbox(null)}
      />
    </article>
  )
}

/** Embedded villa viewer; the 3D bundle and model load only when scrolled near. */
function ProjectModel() {
  const ref = useRef<HTMLDivElement>(null)
  const [load, setLoad] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [preset, setPreset] = useState<LightingPreset>('daylight')
  const [section, setSection] = useState(false)
  const supported = hasWebGL()

  useEffect(() => {
    const el = ref.current
    if (!el || !supported) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLoad(true), { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [supported])

  return (
    <section className="on-dark bg-charcoal py-24 text-ivory md:py-32">
      <div className="container-wide">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow className="mb-6 text-stone">Interactive model</Eyebrow>
            <h2 className="max-w-2xl font-serif text-headline">Walk around the villa.</h2>
          </div>
          <Link to="/experience" className="eyebrow link-underline inline-flex items-center gap-2">
            <Box aria-hidden className="size-4" /> Open the full 3D experience
          </Link>
        </div>
        <div ref={ref} className="relative aspect-[4/3] w-full overflow-hidden md:aspect-[16/8]">
          {supported ? (
            load && (
              <Suspense fallback={<PageLoading label="Loading 3D viewer" />}>
                <VillaExplorer
                  model={MODELS.mutram}
                  className="absolute inset-0"
                  compact
                  active={active}
                  onActiveChange={setActive}
                  preset={preset}
                  onPresetChange={setPreset}
                  section={section}
                  onSectionChange={setSection}
                />
              </Suspense>
            )
          ) : (
            <p className="p-8 text-ivory/70">Your browser does not support WebGL, so the interactive model cannot be shown. The renderings above show the same scene.</p>
          )}
        </div>
      </div>
    </section>
  )
}
