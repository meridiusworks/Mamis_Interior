import { useGSAP } from '@gsap/react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap, Parallax } from '../components/animations/Parallax'
import { ProjectCard } from '../components/projects/ProjectCard'
import { VILLA_FALLBACK } from '../components/three/ViewerStates'
import { ButtonLink } from '../components/ui/Button'
import { ConsultationCta, Eyebrow, SampleNote, SectionHeading } from '../components/ui/Misc'
import { Picture } from '../components/ui/Picture'
import { ImageReveal, Reveal, SplitHeadline } from '../components/ui/Reveal'
import { Dialogue, dialogue } from '../components/ui/Dialogue'
import { Seo, studioJsonLd } from '../components/ui/Seo'
import { site } from '../config/site'
import { useAsync } from '../hooks/useAsync'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'
import { getArticles, getProjects, getServices, getStudio } from '../services/content'
import { hasWebGL, performanceTier } from '../utils/device'
import { cn, formatDate } from '../utils/format'

const HeroScene = lazy(() => import('../components/three/HeroScene'))

export default function Home() {
  return (
    <>
      <Seo jsonLd={studioJsonLd()} />
      <Hero />
      <Philosophy />
      <FeaturedProjects />
      <ServicesPreview />
      <ProcessSection />
      <Recognition />
      <Testimonials />
      <JournalPreview />
      <ConsultationCta title="A plot, an old house, or just one room?" />
    </>
  )
}

function Hero() {
  const reduced = usePrefersReducedMotion()
  const [enable3d, setEnable3d] = useState(false)
  const [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(false)
  const [lowPower] = useState(() => performanceTier() === 'low')

  // Defer the 3D scene until the page is idle so the static hero paints first.
  useEffect(() => {
    if (!hasWebGL() || lowPower) return
    const start = () => setEnable3d(true)
    if (typeof window.requestIdleCallback === 'function') {
      // The timeout guarantees a start even when the browser never goes idle.
      const id = window.requestIdleCallback(start, { timeout: 1500 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(start, 600)
    return () => window.clearTimeout(id)
  }, [lowPower])

  return (
    <section className="on-dark relative h-[100svh] min-h-[640px] overflow-hidden bg-charcoal text-ivory">
      <motion.div className="absolute inset-0" animate={{ opacity: ready ? 0 : 1 }} transition={{ duration: 1.2 }}>
        <Picture image={VILLA_FALLBACK} fill priority sizes="100vw" className="scale-[1.02]" />
      </motion.div>
      {enable3d && (
        <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: ready ? 1 : 0 }} transition={{ duration: 1.4 }}>
          <Suspense fallback={null}>
            <HeroScene reducedMotion={reduced || paused} lowPower={lowPower} onReady={() => setReady(true)} />
          </Suspense>
        </motion.div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/25 to-charcoal/50" />

      <div className="pointer-events-none relative container-wide flex h-full flex-col justify-end pt-24 pb-12 sm:pb-16">
        <motion.p
          className="eyebrow mb-6 text-stone"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
        >
          {site.name} · {site.tagline}
        </motion.p>
        <SplitHeadline text={dialogue('hero').ta} className="max-w-[20ch] font-serif text-[clamp(2.4rem,min(6.4vw,9.5vh),6.5rem)] leading-[0.98] italic" delay={0.15} />
        <motion.p
          lang="ta"
          className="mt-4 text-[1.05rem] text-ivory/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 1 }}
        >
          {dialogue('hero').script} <span lang="en" className="text-ivory/50">— {dialogue('hero').en}</span>
        </motion.p>
        <div className="mt-6 flex flex-col gap-6 md:mt-[clamp(1.5rem,4vh,2.5rem)] md:flex-row md:items-end md:justify-between">
          <motion.p
            className="max-w-md text-[1.05rem] leading-relaxed text-ivory/80"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            South Indian homes and interiors — thinnai, mutram, oonjal, Athangudi tiles and brass. The modern villa
            behind this text is a live 3D model built in Blender.
          </motion.p>
          <motion.div
            className="pointer-events-auto flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 1 }}
          >
            <ButtonLink to="/experience" variant="light" aria-label="Walk around the house in 3D">
              <span lang="ta-Latn">{dialogue('explore').ta}</span>
            </ButtonLink>
            <ButtonLink to="/projects" variant="ghost" arrow={false}>
              View projects
            </ButtonLink>
          </motion.div>
        </div>
      </div>

      <a
        href="#intro"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.62rem] tracking-[0.3em] text-ivory/70 uppercase md:flex"
        aria-label="Scroll to introduction"
      >
        <span lang="ta-Latn">{dialogue('scroll').ta}</span>
        <span className="relative h-10 w-px overflow-hidden bg-ivory/20">
          <motion.span
            className="absolute inset-x-0 top-0 h-1/2 bg-ivory"
            animate={reduced ? undefined : { y: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          />
        </span>
        <ArrowDown aria-hidden className="sr-only" />
      </a>

      {enable3d && ready && !reduced && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="absolute right-4 bottom-6 z-10 inline-flex items-center gap-2 rounded-full border border-ivory/25 px-3 py-2 text-[0.62rem] tracking-[0.18em] text-ivory/80 uppercase hover:bg-ivory/10 sm:right-8"
        >
          {paused ? <Play aria-hidden className="size-3" /> : <Pause aria-hidden className="size-3" />}
          {paused ? 'Play motion' : 'Pause motion'}
        </button>
      )}
    </section>
  )
}

function Philosophy() {
  return (
    <section id="intro" className="container-wide grid gap-14 py-28 md:py-40 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Reveal>
          <Eyebrow className="mb-8 text-olive">The studio</Eyebrow>
          <h2 className="font-serif text-headline">
            Homes that feel like <em className="text-olive-deep">ammachi's veedu</em> — with better plumbing and
            fewer mosquitoes.
          </h2>
          <Dialogue id="philosophy" className="mt-8" />
        </Reveal>
        <Reveal delay={0.15} className="mt-12 grid max-w-2xl gap-8 text-charcoal/75 sm:grid-cols-2">
          <p>
            Every project starts by listening: to the plot, to the old house, and to how three generations want to live
            under one roof. Only then do we draw.
          </p>
          <p>
            Courtyards, verandahs, clay roofs and lime walls are not nostalgia — they are Tamil Nadu's original climate
            engineering. We pair them with modern kitchens, storage and light.
          </p>
        </Reveal>
        <Reveal delay={0.25} className="mt-12">
          <Link to="/studio" className="link-underline eyebrow">
            About the studio
          </Link>
        </Reveal>
      </div>
      <div className="lg:col-span-4 lg:col-start-9">
        <Parallax className="aspect-[10/13]" amount={14}>
          <Picture
            image={{ src: '/images/renders/mutram-thinnai', alt: 'Thinnai seats and teak pillars along the verandah of Mutram Veedu', ratio: 0.769 }}
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
          />
        </Parallax>
        <p className="mt-4 text-[0.8rem] text-charcoal/55">Mutram Veedu — the thinnai verandah.</p>
      </div>
    </section>
  )
}

function FeaturedProjects() {
  const projects = useAsync(getProjects, [])
  const featured = projects.data?.filter((p) => p.featured) ?? []
  return (
    <section className="bg-ivory-deep py-28 md:py-36">
      <div className="container-wide">
        <div className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <SectionHeading eyebrow="Selected work" title="Featured projects" />
            <Dialogue id="featured" size="sm" className="mt-6" />
          </div>
          <ButtonLink to="/projects" variant="outline">
            All projects
          </ButtonLink>
        </div>
        <div className="grid gap-x-10 gap-y-20 md:grid-cols-12">
          {featured.map((p, i) => (
            <Reveal
              key={p.slug}
              delay={(i % 2) * 0.1}
              className={cn(
                i === 0 && 'md:col-span-12',
                i === 1 && 'md:col-span-5 md:mt-24',
                i === 2 && 'md:col-span-6 md:col-start-7',
                i === 3 && 'md:col-span-7 md:col-start-3',
              )}
            >
              <ProjectCard
                project={p}
                index={i}
                imageClassName={i === 0 ? 'aspect-[16/9] md:aspect-[21/9]' : i === 1 ? 'aspect-[4/5]' : 'aspect-[16/10]'}
                sizes={i === 0 ? '100vw' : '(min-width: 768px) 50vw, 100vw'}
              />
            </Reveal>
          ))}
        </div>
        <SampleNote className="mt-16">
          All projects are concept and design studies for a fictional studio, visualised in Blender. None is presented as
          a completed client commission.
        </SampleNote>
      </div>
    </section>
  )
}

const PREVIEW_SERVICES = ['architectural-design', 'luxury-residential-interiors', 'renovation-restoration', '3d-visualization']

function ServicesPreview() {
  const services = useAsync(getServices, [])
  const list = services.data?.filter((s) => PREVIEW_SERVICES.includes(s.slug)) ?? []
  const [active, setActive] = useState(0)
  const current = list[active]
  return (
    <section className="container-wide py-28 md:py-40">
      <SectionHeading
        eyebrow="Services"
        title="From the plinth to the oonjal cushion."
        intro="Architecture, interiors, renovation and visualisation under one roof — so nothing is lost between disciplines."
      />
      <Dialogue id="services" size="sm" className="mt-8" />
      <div className="mt-16 grid gap-12 lg:grid-cols-12">
        <ul className="lg:col-span-6">
          {list.map((s, i) => (
            <li key={s.slug}>
              <Link
                to={`/services#${s.slug}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className="group flex items-baseline gap-6 border-t border-charcoal/15 py-7"
              >
                <span className="text-[0.75rem] text-olive tabular-nums">{s.number}</span>
                <span className="flex-1">
                  <span className={cn('block font-serif text-[clamp(1.8rem,3.4vw,3rem)] leading-none transition-colors duration-500', active === i ? 'text-charcoal' : 'text-charcoal/40')}>
                    {s.title}
                  </span>
                  <span className="mt-3 block max-w-md text-[0.92rem] text-charcoal/65">{s.short}</span>
                </span>
                <ArrowRight aria-hidden className="size-5 opacity-0 transition-all duration-500 group-hover:translate-x-1 group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="relative hidden aspect-[4/3] overflow-hidden bg-ivory-deep lg:col-span-5 lg:col-start-8 lg:block">
          <AnimatePresence mode="popLayout" initial={false}>
            {current && (
              <motion.div
                key={current.slug}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                <Picture image={current.image} fill sizes="40vw" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-12">
        <ButtonLink to="/services" variant="outline">
          All ten services
        </ButtonLink>
      </div>
    </section>
  )
}

/** Horizontal, scroll-pinned walk through the five stages (desktop); a stacked list elsewhere. */
function ProcessSection() {
  const studio = useAsync(getStudio, [])
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const steps = studio.data?.process ?? []

  useGSAP(
    () => {
      if (!steps.length) return
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const el = track.current!
        const distance = () => el.scrollWidth - window.innerWidth
        gsap.to(el, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section.current,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        })
      })
      return () => mm.revert()
    },
    { scope: section, dependencies: [steps.length] },
  )

  return (
    <section ref={section} className="on-dark overflow-hidden bg-charcoal text-ivory">
      <div className="flex min-h-screen flex-col justify-center py-24 lg:h-screen lg:min-h-0 lg:pt-24 lg:pb-8">
        <div className="container-wide mb-14 lg:mb-[clamp(1.5rem,5vh,3.5rem)]">
          <Eyebrow className="mb-6 text-stone">Design process</Eyebrow>
          <h2 className="max-w-3xl font-serif text-headline">Five stages, one model, no surprises on site.</h2>
          <Dialogue id="process" size="sm" tone="dark" className="mt-6" />
        </div>
        <div ref={track} className="flex flex-col gap-6 px-4 sm:px-8 lg:w-max lg:flex-row lg:gap-8 lg:px-12">
          {steps.map((s) => (
            <article key={s.number} className="flex min-h-[300px] flex-col justify-between border border-ivory/15 p-8 lg:min-h-0 lg:h-[clamp(240px,42vh,400px)] lg:w-[400px] lg:shrink-0 lg:p-[clamp(1.25rem,3vh,2rem)]">
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-[4.5rem] leading-none text-stone">{s.number}</span>
                <span className="eyebrow text-ivory/50">{s.duration}</span>
              </div>
              <div>
                <h3 className="mb-3 font-serif text-[2rem]">{s.title}</h3>
                <p className="text-[0.95rem] leading-relaxed text-ivory/70">{s.text}</p>
              </div>
            </article>
          ))}
          <div className="flex items-center lg:w-[420px] lg:shrink-0 lg:pl-8">
            <ImageReveal className="aspect-[10/13] w-full max-w-sm lg:aspect-auto lg:h-auto">
              <Picture image={{ src: '/images/drawings/mutram-axonometric', alt: 'Axonometric drawing of the courtyard house exported from the model', ratio: 1.6 }} className="aspect-[10/13] object-cover lg:aspect-auto lg:h-[clamp(240px,42vh,400px)]" sizes="400px" />
            </ImageReveal>
          </div>
        </div>
      </div>
    </section>
  )
}

function Recognition() {
  const studio = useAsync(getStudio, [])
  const items = studio.data?.press.slice(0, 4) ?? []
  return (
    <section className="container-wide py-28 md:py-36">
      <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <div>
          <SectionHeading eyebrow="Recognition" title="Awards & publications" />
          <Dialogue id="recognition" size="sm" className="mt-6" />
        </div>
        <ButtonLink to="/recognition" variant="outline">
          Press &amp; recognition
        </ButtonLink>
      </div>
      <ul className="divide-y divide-charcoal/15 border-y border-charcoal/15">
        {items.map((p) => (
          <li key={p.id} className="grid gap-2 py-6 md:grid-cols-[120px_1fr_1fr_140px] md:items-baseline md:gap-8">
            <span className="eyebrow text-olive">{p.kind}</span>
            <span className="font-serif text-[1.5rem] leading-tight">{p.title}</span>
            <span className="text-charcoal/65">{p.outlet}</span>
            <span className="text-[0.85rem] text-charcoal/55 tabular-nums md:text-right">{formatDate(p.date, { month: 'short', year: 'numeric' })}</span>
          </li>
        ))}
      </ul>
      <SampleNote className="mt-6">
        Awards and outlets labelled “Sample” are placeholders that show how recognition would be presented; they are not
        real honours.
      </SampleNote>
    </section>
  )
}

function Testimonials() {
  const studio = useAsync(getStudio, [])
  const list = studio.data?.testimonials ?? []
  const [i, setI] = useState(0)
  const t = list[i]
  if (!t) return null
  return (
    <section className="bg-stone/25 py-28 md:py-36" aria-roledescription="carousel" aria-label="Client testimonials">
      <div className="container-wide grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <Eyebrow className="text-olive-deep">In their words</Eyebrow>
          <Dialogue id="testimonials" size="sm" className="mt-6" />
        </div>
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            <motion.figure
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.6 }}
              aria-live="polite"
            >
              <blockquote lang="ta-Latn" className="font-serif text-[clamp(1.8rem,3.6vw,3.2rem)] leading-[1.15]">“{t.quote}”</blockquote>
              <figcaption className="mt-8 text-[0.9rem] text-charcoal/70">
                {t.attribution} — {t.context}
              </figcaption>
            </motion.figure>
          </AnimatePresence>
          <div className="mt-10 flex items-center gap-4">
            <button type="button" aria-label="Previous testimonial" onClick={() => setI((i - 1 + list.length) % list.length)} className="grid size-11 place-items-center rounded-full border border-charcoal/25 hover:bg-charcoal hover:text-ivory">
              <ArrowLeft aria-hidden className="size-4" />
            </button>
            <button type="button" aria-label="Next testimonial" onClick={() => setI((i + 1) % list.length)} className="grid size-11 place-items-center rounded-full border border-charcoal/25 hover:bg-charcoal hover:text-ivory">
              <ArrowRight aria-hidden className="size-4" />
            </button>
            <span className="text-[0.8rem] text-charcoal/55 tabular-nums">
              {i + 1} / {list.length}
            </span>
          </div>
          <SampleNote className="mt-8">Illustrative testimonials written for this demonstration — not statements by real clients.</SampleNote>
        </div>
      </div>
    </section>
  )
}

function JournalPreview() {
  const articles = useAsync(getArticles, [])
  const list = articles.data?.slice(0, 3) ?? []
  return (
    <section className="container-wide py-28 md:py-36">
      <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <div>
          <SectionHeading eyebrow="Journal" title="Notes on thinnai, tiles and monsoons." />
          <Dialogue id="journal" size="sm" className="mt-6" />
        </div>
        <ButtonLink to="/journal" variant="outline">
          Read the journal
        </ButtonLink>
      </div>
      <div className="grid gap-12 md:grid-cols-3">
        {list.map((a, i) => (
          <Reveal key={a.slug} delay={i * 0.08}>
            <Link to={`/journal/${a.slug}`} className="group block" data-cursor="Read">
              <div className="relative aspect-[4/3] overflow-hidden bg-ivory-deep">
                <Picture image={a.cover} fill sizes="(min-width: 768px) 33vw, 100vw" className="transition-transform duration-[1.4s] group-hover:scale-[1.045]" />
              </div>
              <p className="eyebrow mt-5 text-olive">
                {a.category} · {a.readingMinutes} min read
              </p>
              <h3 className="mt-3 font-serif text-[1.65rem] leading-tight">{a.title}</h3>
              <p className="mt-2 text-[0.92rem] text-charcoal/65">{a.dek}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
