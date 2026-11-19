import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ButtonLink } from '../components/ui/Button'
import { Breadcrumbs, ConsultationCta, PageError, PageLoading } from '../components/ui/Misc'
import { Picture } from '../components/ui/Picture'
import { ImageReveal, Reveal, SplitHeadline } from '../components/ui/Reveal'
import { Dialogue } from '../components/ui/Dialogue'
import { Seo } from '../components/ui/Seo'
import { useAsync } from '../hooks/useAsync'
import { getProjects, getServices } from '../services/content'
import { cn } from '../utils/format'

export default function Services() {
  const state = useAsync(() => Promise.all([getServices(), getProjects()]), [])
  const [current, setCurrent] = useState<string | null>(null)
  const { hash } = useLocation()

  // Content loads after navigation, so honour #service links once it is in the DOM.
  // Waits for the page transition and ScrollTrigger's refresh, which would otherwise reset the position.
  useEffect(() => {
    if (state.status !== 'success' || !hash) return
    const id = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 450)
    return () => window.clearTimeout(id)
  }, [state.status, hash])

  // Highlight the service currently in view in the side index.
  useEffect(() => {
    if (state.status !== 'success') return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setCurrent(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    document.querySelectorAll('[data-service]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [state.status])

  if (state.status === 'loading') return <PageLoading />
  if (state.status === 'error') return <PageError message={state.error.message} />
  const [services, projects] = state.data

  return (
    <>
      <Seo title="Services" description="Architecture, interiors, renovation, space planning, 3D visualisation, material consultation and sustainable design — ten ways to work with Mami’s Interior." />
      <section className="container-wide pt-36 pb-20 md:pt-44">
        <Breadcrumbs items={[{ label: 'Services' }]} />
        <SplitHeadline text="Ten ways to work with us." className="mt-8 max-w-[13ch] font-serif text-display" />
        <Dialogue id="services" className="mt-8" />
        <p className="mt-8 max-w-xl text-[1.05rem] text-charcoal/70">
          From a two-hour consultation to a complete building. Every service ends with a clear set of deliverables and a
          way to start.
        </p>
      </section>

      <div className="container-wide grid gap-12 pb-24 lg:grid-cols-12">
        <nav aria-label="Services index" className="hidden lg:col-span-3 lg:block">
          <ol className="sticky top-28 space-y-1.5">
            {services.map((s) => (
              <li key={s.slug}>
                <a
                  href={`#${s.slug}`}
                  aria-current={current === s.slug ? 'true' : undefined}
                  className={cn('flex gap-3 py-1 text-[0.88rem] transition-colors', current === s.slug ? 'text-charcoal' : 'text-charcoal/45 hover:text-charcoal')}
                >
                  <span className="text-olive tabular-nums">{s.number}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-28 lg:col-span-9">
          {services.map((s, i) => {
            const related = projects.filter((p) => s.projects.includes(p.slug))
            return (
              <section key={s.slug} id={s.slug} data-service className="scroll-mt-28 border-t border-charcoal/15 pt-10">
                <div className="grid gap-10 md:grid-cols-2">
                  <div className={cn(i % 2 && 'md:order-2')}>
                    <p className="font-serif text-[3.5rem] leading-none text-olive">{s.number}</p>
                    <h2 className="mt-6 font-serif text-title">{s.title}</h2>
                    <p className="mt-6 text-charcoal/75">{s.description}</p>
                  </div>
                  <ImageReveal className={cn('self-start', i % 2 && 'md:order-1')}>
                    <Picture image={s.image} sizes="(min-width: 1024px) 36vw, 100vw" className={s.image.src.includes('/drawings/') ? 'contrast-[1.25] brightness-[1.1]' : undefined} />
                  </ImageReveal>
                </div>
                <div className="mt-12 grid gap-10 md:grid-cols-2">
                  <Reveal>
                    <h3 className="eyebrow mb-5 text-charcoal/60">Deliverables</h3>
                    <ul className="space-y-3">
                      {s.deliverables.map((d) => (
                        <li key={d} className="flex gap-3 text-[0.95rem]">
                          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-olive" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                  <Reveal delay={0.1}>
                    <h3 className="eyebrow mb-5 text-charcoal/60">Process</h3>
                    <ol className="space-y-4">
                      {s.process.map((step, j) => (
                        <li key={step.title} className="grid grid-cols-[28px_1fr] gap-3 text-[0.95rem]">
                          <span className="text-olive tabular-nums">{j + 1}.</span>
                          <span>
                            <strong className="font-medium">{step.title}</strong> — <span className="text-charcoal/70">{step.text}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </Reveal>
                </div>
                <div className="mt-10 flex flex-wrap items-center gap-6">
                  <ButtonLink to={`/consultation?service=${s.slug}`}>Start an inquiry</ButtonLink>
                  {related.length > 0 && (
                    <p className="text-[0.88rem] text-charcoal/60">
                      Related:{' '}
                      {related.map((p, k) => (
                        <span key={p.slug}>
                          <Link to={`/projects/${p.slug}`} className="link-underline text-charcoal">
                            {p.title}
                          </Link>
                          {k < related.length - 1 && ', '}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
      <ConsultationCta />
    </>
  )
}
