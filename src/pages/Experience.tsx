import { AnimatePresence, motion } from 'framer-motion'
import { Hand, Keyboard, MousePointer2 } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ViewerFallback } from '../components/three/ViewerStates'
import { isModelId, MODEL_ORDER, MODELS, type ModelConfig } from '../components/three/models'
import type { LightingPreset } from '../components/three/villa'
import { Breadcrumbs, PageLoading, SampleNote } from '../components/ui/Misc'
import { Dialogue } from '../components/ui/Dialogue'
import { Seo } from '../components/ui/Seo'
import { useAsync } from '../hooks/useAsync'
import { getMaterials } from '../services/content'
import { hasWebGL } from '../utils/device'
import { cn } from '../utils/format'

const VillaExplorer = lazy(() => import('../components/three/VillaExplorer').then((m) => ({ default: m.VillaExplorer })))

export default function Experience() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('model')
  const model = MODELS[requested && isModelId(requested) && requested !== 'mutram' ? requested : 'villa']
  const choose = (id: string) => setParams(id === 'villa' ? {} : { model: id }, { replace: true })
  // Keyed so each model starts with fresh selection, lighting and section state.
  return <ExperienceBody key={model.id} model={model} onChoose={choose} />
}

function ExperienceBody({ model, onChoose }: { model: ModelConfig; onChoose: (id: string) => void }) {
  const hotspots = model.hotspots
  const [active, setActive] = useState<string | null>(null)
  const [preset, setPreset] = useState<LightingPreset>('daylight')
  const [section, setSection] = useState(model.sectionDefault)
  const materials = useAsync(getMaterials, [])
  const supported = hasWebGL()
  const selected = hotspots.find((h) => h.id === active)

  return (
    <>
      <Seo
        title="3D Experience"
        description={`Explore a ${model.title.toLowerCase()} modelled in Blender and rendered live with Three.js — orbit, zoom, inspect rooms and materials, and switch lighting.`}
      />
      <div className="on-dark grid bg-charcoal pt-[72px] text-ivory lg:h-[100svh] lg:grid-cols-[1fr_400px]">
        <div className="relative h-[68svh] min-h-[420px] lg:h-auto">
          {supported ? (
            <Suspense fallback={<PageLoading label="Loading 3D viewer" />}>
              <VillaExplorer
                model={model}
                className="absolute inset-0"
                active={active}
                onActiveChange={setActive}
                preset={preset}
                onPresetChange={setPreset}
                section={section}
                onSectionChange={setSection}
              />
            </Suspense>
          ) : (
            <ViewerFallback image={model.fallback} reason="WebGL is not available in this browser, so the interactive model cannot run. Here is a rendering of the same model." />
          )}
        </div>

        <aside className="flex flex-col overflow-y-auto border-l border-ivory/10 px-6 py-8 lg:px-8" aria-label="Model information">
          <Breadcrumbs tone="dark" items={[{ label: '3D Experience' }]} />
          <div role="group" aria-label="Choose a model" className="mt-6 flex flex-wrap gap-2">
            {MODEL_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={model.id === id}
                onClick={() => onChoose(id)}
                className={cn(
                  'rounded-full border px-4 py-2 text-[0.7rem] tracking-[0.12em] uppercase transition-colors',
                  model.id === id ? 'border-ivory bg-ivory text-charcoal' : 'border-ivory/30 hover:border-ivory',
                )}
              >
                {MODELS[id].label}
              </button>
            ))}
          </div>
          <h1 className="mt-6 font-serif text-[2.6rem] leading-none">{model.title}</h1>
          <p className="mt-3 text-[0.92rem] text-ivory/65">{model.blurb}</p>

          <Dialogue id="experience" size="sm" tone="dark" className="mt-5" />
          <dl className="mt-6 grid grid-cols-3 gap-3 border-y border-ivory/10 py-4 text-center text-[0.72rem]">
            {[
              ['Source', 'Blender'],
              ['Format', 'GLB · Draco'],
              ['Hotspots', String(hotspots.length)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-ivory/45 uppercase tracking-[0.14em]">{k}</dt>
                <dd className="mt-1 text-ivory">{v}</dd>
              </div>
            ))}
          </dl>

          <h2 className="eyebrow mt-8 mb-3 text-stone">Points of interest</h2>
          <ol className="space-y-1">
            {hotspots.map((h, i) => (
              <li key={h.id}>
                <button
                  type="button"
                  aria-pressed={active === h.id}
                  onClick={() => setActive(active === h.id ? null : h.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-[0.92rem] transition-colors',
                    active === h.id ? 'bg-ivory text-charcoal' : 'hover:bg-ivory/8',
                  )}
                >
                  <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[0.65rem] tabular-nums', active === h.id ? 'bg-charcoal text-ivory' : 'bg-ivory/15')}>{i + 1}</span>
                  <span className="flex-1">{h.title}</span>
                  <span className="text-[0.65rem] tracking-[0.14em] uppercase opacity-60">{h.kind}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="mt-6 min-h-[170px]" aria-live="polite">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                  <h3 className="font-serif text-[1.6rem]">{selected.title}</h3>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-ivory/70">{selected.description}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {selected.materials.map((slug) => {
                      const m = materials.data?.materials.find((x) => x.slug === slug)
                      if (!m) return null
                      return (
                        <li key={slug}>
                          <Link to={`/materials?material=${slug}`} className="inline-flex items-center gap-2 rounded-full border border-ivory/20 py-1 pr-3 pl-1 text-[0.75rem] hover:border-ivory">
                            <span aria-hidden className="size-5 rounded-full bg-cover" style={{ backgroundColor: m.color, backgroundImage: m.texture ? `url(/textures/${m.texture}.jpg)` : undefined }} />
                            {m.name}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </motion.div>
              ) : (
                <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[0.9rem] text-ivory/55">
                  {model.hint}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-auto space-y-2 border-t border-ivory/10 pt-6 text-[0.78rem] text-ivory/55">
            <p className="flex gap-2">
              <MousePointer2 aria-hidden className="size-4 shrink-0" /> Drag to orbit · scroll to zoom · right-drag to pan
            </p>
            <p className="flex gap-2">
              <Hand aria-hidden className="size-4 shrink-0" /> One finger to orbit · pinch to zoom · two fingers to pan
            </p>
            <p className="flex gap-2">
              <Keyboard aria-hidden className="size-4 shrink-0" /> Focus the model, then ← → to rotate, + − to zoom, R to reset
            </p>
            <SampleNote tone="dark" className="pt-3">
              Real-time lighting is simplified compared with the offline renderings in the project gallery.
            </SampleNote>
          </div>
        </aside>
      </div>
    </>
  )
}
