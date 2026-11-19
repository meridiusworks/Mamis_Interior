import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Breadcrumbs, ConsultationCta, PageError, PageLoading, SampleNote } from '../components/ui/Misc'
import { Picture } from '../components/ui/Picture'
import { Reveal, SplitHeadline } from '../components/ui/Reveal'
import { Dialogue } from '../components/ui/Dialogue'
import { Seo } from '../components/ui/Seo'
import { useAsync } from '../hooks/useAsync'
import { getProjects, getStudio } from '../services/content'
import type { PressItem } from '../types/content'
import { cn, formatDate } from '../utils/format'

const KINDS: ('All' | PressItem['kind'])[] = ['All', 'Award', 'Publication', 'Interview', 'Exhibition']

export default function Recognition() {
  const state = useAsync(() => Promise.all([getStudio(), getProjects()]), [])
  const [kind, setKind] = useState<(typeof KINDS)[number]>('All')
  if (state.status === 'loading') return <PageLoading />
  if (state.status === 'error') return <PageError message={state.error.message} />
  const [{ press }, projects] = state.data
  const items = [...press].sort((a, b) => b.date.localeCompare(a.date)).filter((p) => kind === 'All' || p.kind === kind)
  const awards = press.filter((p) => p.kind === 'Award')

  return (
    <>
      <Seo title="Press & Recognition" description="Awards, publications, interviews and exhibitions — sample recognition entries for the fictional Mami’s Interior studio." />
      <section className="container-wide pt-36 pb-12 md:pt-44">
        <Breadcrumbs items={[{ label: 'Recognition' }]} />
        <SplitHeadline text="Press & recognition" className="mt-8 max-w-[12ch] font-serif text-display" />
        <Dialogue id="recognition" className="mt-8" />
        <div className="mt-10 max-w-2xl rounded-sm border border-charcoal/15 bg-white/60 p-5">
          <SampleNote>
            Mami’s Interior is a fictional studio. Entries from outlets named “Sample …” are placeholders demonstrating the
            layout — they are not real awards, endorsements or media coverage. Journal entries link to essays published on
            this site.
          </SampleNote>
        </div>
      </section>

      <section className="container-wide grid gap-6 py-12 md:grid-cols-3">
        {awards.map((a, i) => (
          <Reveal key={a.id} delay={i * 0.08} className="flex min-h-[260px] flex-col justify-between bg-charcoal p-8 text-ivory">
            <p className="eyebrow text-stone">{formatDate(a.date, { year: 'numeric' })}</p>
            <div>
              <p className="font-serif text-[1.8rem] leading-tight">{a.title}</p>
              <p className="mt-3 text-[0.85rem] text-ivory/60">{a.outlet}</p>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="container-wide py-16">
        <div role="group" aria-label="Filter by type" className="mb-10 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn('rounded-full border px-4 py-2 text-[0.78rem] transition-colors', kind === k ? 'border-charcoal bg-charcoal text-ivory' : 'border-charcoal/20 hover:border-charcoal')}>
              {k}
            </button>
          ))}
        </div>
        <ul className="grid gap-8 md:grid-cols-2">
          {items.map((p) => {
            const project = projects.find((x) => x.slug === p.project)
            return (
              <li key={p.id} className="grid grid-cols-[110px_1fr] gap-6 border-t border-charcoal/15 pt-6 sm:grid-cols-[150px_1fr]">
                <div className="relative aspect-square overflow-hidden bg-ivory-deep">
                  {project ? <Picture image={project.cover} fill sizes="150px" /> : <span aria-hidden className="absolute inset-0 grid place-items-center font-serif text-4xl text-olive">AN</span>}
                </div>
                <div>
                  <p className="eyebrow text-olive">
                    {p.kind} · <time dateTime={p.date}>{formatDate(p.date)}</time>
                  </p>
                  <h2 className="mt-3 font-serif text-[1.6rem] leading-tight">{p.title}</h2>
                  <p className="mt-1 text-[0.85rem] text-charcoal/60">{p.outlet}</p>
                  <p className="mt-3 text-[0.92rem] text-charcoal/75">{p.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-5 text-[0.82rem]">
                    {p.link && (
                      <Link to={p.link} className="link-underline inline-flex items-center gap-1">
                        Read the article <ArrowUpRight aria-hidden className="size-3.5" />
                      </Link>
                    )}
                    {project && (
                      <Link to={`/projects/${project.slug}`} className="link-underline text-charcoal/70">
                        Project: {project.title}
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
      <ConsultationCta />
    </>
  )
}
