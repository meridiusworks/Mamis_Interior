import { AnimatePresence, motion } from 'framer-motion'
import { SlidersHorizontal, X } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { projectCategories } from '../components/navigation/nav'
import { ProjectCard } from '../components/projects/ProjectCard'
import { Breadcrumbs, ConsultationCta, PageError, PageLoading, SampleNote } from '../components/ui/Misc'
import { SplitHeadline } from '../components/ui/Reveal'
import { dialogue } from '../components/ui/Dialogue'
import { Seo } from '../components/ui/Seo'
import { useAsync } from '../hooks/useAsync'
import { getProjects } from '../services/content'
import type { Project } from '../types/content'
import { cn } from '../utils/format'

const ease = [0.22, 1, 0.36, 1] as const

/** Alternating card proportions give the grid its editorial rhythm. */
const layout = [
  'md:col-span-7 aspect-[16/10]',
  'md:col-span-5 md:mt-28 aspect-[4/5]',
  'md:col-span-5 aspect-[4/5]',
  'md:col-span-7 md:mt-20 aspect-[16/10]',
]

export default function Projects() {
  const state = useAsync(getProjects, [])
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? 'All'
  const location = params.get('location') ?? 'All'
  const year = params.get('year') ?? 'All'
  const type = params.get('type') ?? 'All'

  const projects = useMemo(() => state.data ?? [], [state.data])
  const options = useMemo(
    () => ({
      locations: [...new Set(projects.map((p) => p.location.split(', ').pop()!))].sort(),
      years: [...new Set(projects.map((p) => String(p.year)))].sort().reverse(),
      types: [...new Set(projects.map((p) => p.type))].sort(),
    }),
    [projects],
  )

  const filtered = useMemo(
    () =>
      projects.filter(
        (p: Project) =>
          (category === 'All' || p.categories.includes(category as Project['categories'][number])) &&
          (location === 'All' || p.location.endsWith(location)) &&
          (year === 'All' || String(p.year) === year) &&
          (type === 'All' || p.type === type),
      ),
    [projects, category, location, year, type],
  )

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === 'All') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true, preventScrollReset: true })
  }
  const activeFilters = [category, location, year, type].filter((v) => v !== 'All').length

  if (state.status === 'error') return <PageError message={state.error.message} />

  return (
    <>
      <Seo
        title={category === 'All' ? 'Projects' : `${category} projects`}
        description="Architecture, interiors, hospitality and renovation projects by Mami’s Interior — filter by category, location, year and type."
      />
      <section className="container-wide pt-36 pb-12 md:pt-44">
        <Breadcrumbs items={[{ label: 'Projects' }]} />
        <SplitHeadline text="Projects" className="mt-8 font-serif text-display" />
        <p className="mt-8 max-w-xl text-[1.05rem] text-charcoal/70">
          Courtyard houses, Chennai flats, a Madurai hotel and a Mylapore renovation — each a study in light, breeze and honest materials.
        </p>
      </section>

      <section aria-label="Filters" className="sticky top-[72px] z-30 border-y border-charcoal/10 bg-ivory/95 backdrop-blur">
        <div className="container-wide flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Category" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {['All', ...projectCategories].map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => set('category', c)}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-2 text-[0.78rem] transition-colors duration-300',
                  category === c ? 'border-charcoal bg-charcoal text-ivory' : 'border-charcoal/20 hover:border-charcoal',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SlidersHorizontal aria-hidden className="size-4 text-charcoal/50" />
            <FilterSelect label="Location" value={location} options={options.locations} onChange={(v) => set('location', v)} />
            <FilterSelect label="Year" value={year} options={options.years} onChange={(v) => set('year', v)} />
            <FilterSelect label="Type" value={type} options={options.types} onChange={(v) => set('type', v)} />
            {activeFilters > 0 && (
              <button type="button" onClick={() => setParams({}, { replace: true })} className="inline-flex items-center gap-1 text-[0.78rem] text-charcoal/70 underline-offset-4 hover:underline">
                <X aria-hidden className="size-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="container-wide py-16">
        <p className="eyebrow mb-12 text-charcoal/60" aria-live="polite">
          {state.status === 'loading' ? 'Loading projects' : `${filtered.length} ${filtered.length === 1 ? 'project' : 'projects'}`}
        </p>
        {state.status === 'loading' ? (
          <PageLoading />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-start gap-5 border border-dashed border-charcoal/25 p-10">
            <p lang="ta-Latn" className="font-serif text-title">{dialogue('empty').ta}</p>
            <p className="text-charcoal/65">{dialogue('empty').en} No projects match these filters.</p>
            <p className="text-charcoal/65">Try another category or clear the filters to see the full portfolio.</p>
            <button type="button" onClick={() => setParams({}, { replace: true })} className="eyebrow link-underline">
              Clear all filters
            </button>
          </div>
        ) : (
          <motion.ul layout className="grid gap-x-10 gap-y-16 md:grid-cols-12">
            <AnimatePresence mode="popLayout">
              {filtered.map((p, i) => {
                const [col, ...rest] = layout[i % layout.length].split(' ')
                const aspect = rest.filter((c) => c.startsWith('aspect')).join(' ')
                const offset = rest.filter((c) => !c.startsWith('aspect')).join(' ')
                return (
                  <motion.li
                    key={p.slug}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.7, ease }}
                    className={cn(col, offset)}
                  >
                    <ProjectCard project={p} imageClassName={aspect} sizes="(min-width: 768px) 55vw, 100vw" />
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </motion.ul>
        )}
        <SampleNote className="mt-20">
          Portfolio entries are concept and design studies for a fictional studio. Locations indicate the intended setting
          of each study.
        </SampleNote>
      </section>
      <ConsultationCta />
    </>
  )
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'cursor-pointer appearance-none rounded-full border bg-transparent py-2 pr-8 pl-4 text-[0.78rem] outline-none',
          value === 'All' ? 'border-charcoal/20' : 'border-charcoal',
        )}
      >
        <option value="All">{label}: All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 text-[0.6rem]">
        ▼
      </span>
    </label>
  )
}
