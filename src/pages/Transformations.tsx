import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BeforeAfter } from '../components/galleries/BeforeAfter'
import { Breadcrumbs, ConsultationCta, PageError, PageLoading, SampleNote } from '../components/ui/Misc'
import { SplitHeadline } from '../components/ui/Reveal'
import { Dialogue } from '../components/ui/Dialogue'
import { Seo } from '../components/ui/Seo'
import { useAsync } from '../hooks/useAsync'
import { getProjects, getTransformations } from '../services/content'
import { cn } from '../utils/format'

export default function Transformations() {
  const state = useAsync(() => Promise.all([getTransformations(), getProjects()]), [])
  const [category, setCategory] = useState('All')
  const categories = useMemo(() => ['All', ...new Set(state.data?.[0].map((t) => t.category) ?? [])], [state.data])

  if (state.status === 'loading') return <PageLoading />
  if (state.status === 'error') return <PageError message={state.error.message} />
  const [items, projects] = state.data
  const list = items.filter((t) => category === 'All' || t.category === category)

  return (
    <>
      <Seo title="Before & After" description="Interactive before-and-after renovation studies — drag the slider to compare existing conditions with the proposed design." />
      <section className="container-wide pt-36 pb-12 md:pt-44">
        <Breadcrumbs items={[{ label: 'Transformations' }]} />
        <SplitHeadline text="Before & after." className="mt-8 font-serif text-display" />
        <Dialogue id="transformations" className="mt-8" />
        <p className="mt-8 max-w-xl text-[1.05rem] text-charcoal/70">
          Renovation studies rendered from identical cameras. Drag the handle — or focus it and use the arrow keys — to
          compare.
        </p>
        <SampleNote className="mt-6 max-w-xl">
          These are design visualisations made in Blender for this portfolio. They are not photographs of completed client
          projects.
        </SampleNote>
      </section>

      <div className="container-wide">
        <div role="group" aria-label="Filter transformations" className="flex flex-wrap gap-2 border-y border-charcoal/10 py-4">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cn('rounded-full border px-4 py-2 text-[0.78rem] transition-colors', category === c ? 'border-charcoal bg-charcoal text-ivory' : 'border-charcoal/20 hover:border-charcoal')}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <section className="container-wide space-y-24 py-16 md:py-24">
        <AnimatePresence mode="popLayout">
          {list.map((t, i) => {
            const project = projects.find((p) => p.slug === t.project)
            return (
              <motion.article
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="grid gap-8 lg:grid-cols-12"
              >
                <div className={cn('lg:col-span-8', i % 2 && 'lg:order-2 lg:col-start-5')}>
                  <BeforeAfter before={t.before} after={t.after} label={t.title} />
                </div>
                <div className={cn('lg:col-span-4', i % 2 && 'lg:order-1')}>
                  <p className="eyebrow text-olive">{t.category}</p>
                  <h2 className="mt-4 font-serif text-title">{t.title}</h2>
                  <p className="mt-4 text-charcoal/70">{t.description}</p>
                  {project && (
                    <Link to={`/projects/${project.slug}`} className="eyebrow link-underline mt-8 inline-block">
                      View {project.title}
                    </Link>
                  )}
                </div>
              </motion.article>
            )
          })}
        </AnimatePresence>
      </section>
      <ConsultationCta title="Have a building that deserves a second life?" />
    </>
  )
}
