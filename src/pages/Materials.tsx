import { AnimatePresence, motion } from 'framer-motion'
import { Box, Circle, Square } from 'lucide-react'
import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { PreviewShape } from '../components/three/MaterialPreview'
import { Breadcrumbs, ConsultationCta, Eyebrow, PageError, PageLoading, SampleNote } from '../components/ui/Misc'
import { Picture } from '../components/ui/Picture'
import { SplitHeadline } from '../components/ui/Reveal'
import { Dialogue } from '../components/ui/Dialogue'
import { Seo } from '../components/ui/Seo'
import { useAsync } from '../hooks/useAsync'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'
import { getMaterials } from '../services/content'
import type { Material, MaterialCategory } from '../types/content'
import { hasWebGL } from '../utils/device'
import { cn } from '../utils/format'

const MaterialPreview = lazy(() => import('../components/three/MaterialPreview'))

const CATEGORIES: MaterialCategory[] = [
  'Natural Stone',
  'Marble',
  'Travertine',
  'Wood',
  'Concrete',
  'Metal',
  'Glass',
  'Ceramic',
  'Fabrics',
  'Paint & Wall Finishes',
]

function Swatch({ m, className }: { m: Material; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('block bg-cover bg-center', className)}
      style={{
        backgroundColor: m.color,
        backgroundImage: m.texture ? `url(/textures/${m.texture}.jpg)` : m.transmission ? 'linear-gradient(135deg,#ffffff88,#dfe6e4 60%,#c9d2cf)' : undefined,
        backgroundBlendMode: m.texture && m.color !== '#ffffff' ? 'multiply' : undefined,
      }}
    />
  )
}

export default function Materials() {
  const state = useAsync(getMaterials, [])
  const [params, setParams] = useSearchParams()
  const [category, setCategory] = useState<'All' | MaterialCategory>('All')
  const [shape, setShape] = useState<PreviewShape>('sphere')
  const reduced = usePrefersReducedMotion()
  const detail = useRef<HTMLDivElement>(null)
  const supported = hasWebGL()

  const materials = useMemo(() => state.data?.materials ?? [], [state.data])
  const selectedSlug = params.get('material') ?? materials[0]?.slug
  const selected = materials.find((m) => m.slug === selectedSlug) ?? materials[0]
  const list = materials.filter((m) => category === 'All' || m.category === category)

  const select = (slug: string) => {
    setParams({ material: slug }, { replace: true, preventScrollReset: true })
    if (window.innerWidth < 1024) detail.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  if (state.status === 'loading') return <PageLoading />
  if (state.status === 'error') return <PageError message={state.error.message} />
  const palettes = state.data.palettes

  return (
    <>
      <Seo title="Materials & Finishes" description="Athangudi tiles, red oxide, teak, granite, brass, cane, silk and lime — an interactive library of South Indian materials you can preview in 3D." />
      <section className="container-wide pt-36 pb-12 md:pt-44">
        <Breadcrumbs items={[{ label: 'Materials' }]} />
        <SplitHeadline text="Material library" className="mt-8 font-serif text-display" />
        <Dialogue id="materials" className="mt-8" />
        <div className="mt-8 grid gap-8 md:grid-cols-2 md:items-end">
          <p className="max-w-xl text-[1.05rem] text-charcoal/70">
            The palette behind our projects. Select a material to preview it in 3D — every texture was generated
            procedurally in Blender and is the same one used in our renderings.
          </p>
          <SampleNote>
            Sample concepts for design exploration — not verified supplier products. Specify from physical samples and
            manufacturer data.
          </SampleNote>
        </div>
      </section>

      <div className="sticky top-[72px] z-30 border-y border-charcoal/10 bg-ivory/95 backdrop-blur">
        <div role="group" aria-label="Material categories" className="scrollbar-none container-wide flex gap-2 overflow-x-auto py-4">
          {(['All', ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cn('shrink-0 rounded-full border px-4 py-2 text-[0.78rem] transition-colors', category === c ? 'border-charcoal bg-charcoal text-ivory' : 'border-charcoal/20 hover:border-charcoal')}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <section className="container-wide grid gap-12 py-14 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="eyebrow mb-6 text-charcoal/55" aria-live="polite">
            {list.length} materials
          </p>
          <motion.ul layout className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {list.map((m) => (
                <motion.li key={m.slug} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.4 }}>
                  <button
                    type="button"
                    onClick={() => select(m.slug)}
                    aria-pressed={selected?.slug === m.slug}
                    className="group block w-full text-left"
                  >
                    <span className={cn('block overflow-hidden ring-offset-4 ring-offset-ivory transition-shadow', selected?.slug === m.slug ? 'ring-2 ring-charcoal' : 'ring-0')}>
                      <Swatch m={m} className="aspect-square transition-transform duration-700 group-hover:scale-105" />
                    </span>
                    <span className="mt-3 block text-[0.9rem] leading-snug">{m.name}</span>
                    <span className="block text-[0.72rem] text-charcoal/55">{m.category}</span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </div>

        <div ref={detail} className="scroll-mt-40 lg:col-span-6">
          {selected && (
            <div className="lg:sticky lg:top-40">
              <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-[#e9e6df] to-[#d9d4c9] sm:aspect-[4/3]">
                {supported ? (
                  <Suspense fallback={<PageLoading label="Loading preview" />}>
                    <MaterialPreview material={selected} shape={shape} reducedMotion={reduced} />
                  </Suspense>
                ) : (
                  <Swatch m={selected} className="absolute inset-0" />
                )}
                <div role="radiogroup" aria-label="Preview object" className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-charcoal/80 p-1 text-ivory backdrop-blur">
                  {(
                    [
                      ['sphere', 'Sphere', Circle],
                      ['block', 'Block', Square],
                      ['room', 'Room corner', Box],
                    ] as const
                  ).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={shape === key}
                      onClick={() => setShape(key)}
                      className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] tracking-[0.1em] uppercase', shape === key ? 'bg-ivory text-charcoal' : 'hover:bg-ivory/15')}
                    >
                      <Icon aria-hidden className="size-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={selected.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="mt-8" aria-live="polite">
                  <p className="eyebrow text-olive">{selected.category}</p>
                  <h2 className="mt-3 font-serif text-title">{selected.name}</h2>
                  <p className="mt-4 text-charcoal/75">{selected.description}</p>
                  <dl className="mt-6 grid gap-4 border-t border-charcoal/10 pt-6 text-[0.88rem] sm:grid-cols-3">
                    <div>
                      <dt className="eyebrow text-charcoal/50">Finish</dt>
                      <dd className="mt-1">{selected.finish}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow text-charcoal/50">Applications</dt>
                      <dd className="mt-1">{selected.applications.join(', ')}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow text-charcoal/50">Care</dt>
                      <dd className="mt-1">{selected.care}</dd>
                    </div>
                  </dl>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      <section className="bg-ivory-deep py-24 md:py-32">
        <div className="container-wide grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow className="mb-6 text-olive">Sample combinations</Eyebrow>
            <h2 className="font-serif text-headline">Palettes from the projects.</h2>
            <div className="mt-10 hidden lg:block">
              <Picture image={{ src: '/images/renders/material-board-low', alt: 'Close view of stone, timber and fabric samples on a plaster table', ratio: 0.769 }} sizes="30vw" />
            </div>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
            {palettes.map((p) => (
              <li key={p.slug} className="bg-ivory p-6">
                <div className="grid grid-cols-4 gap-1.5">
                  {p.materials.map((slug) => {
                    const m = materials.find((x) => x.slug === slug)
                    return m ? (
                      <button key={slug} type="button" onClick={() => select(slug)} aria-label={`Preview ${m.name}`} className="group">
                        <Swatch m={m} className="aspect-[3/4] transition-transform group-hover:scale-[0.96]" />
                      </button>
                    ) : null
                  })}
                </div>
                <h3 className="mt-5 font-serif text-[1.6rem]">{p.name}</h3>
                <p className="mt-2 text-[0.9rem] text-charcoal/65">{p.mood}</p>
                <p className="mt-3 text-[0.78rem] text-charcoal/50">
                  {p.materials.map((s) => materials.find((m) => m.slug === s)?.name).filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <ConsultationCta title="Need help choosing what you'll touch every day?" text="Our furniture and material consultation pairs physical samples with 3D previews in your own rooms." />
    </>
  )
}
