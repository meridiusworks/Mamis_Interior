import { useGSAP } from '@gsap/react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap, Parallax } from '../components/animations/Parallax'
import { ButtonLink } from '../components/ui/Button'
import { Breadcrumbs, ConsultationCta, Eyebrow, PageError, PageLoading, SampleNote, SectionHeading } from '../components/ui/Misc'
import { Picture } from '../components/ui/Picture'
import { ImageReveal, Reveal, SplitHeadline } from '../components/ui/Reveal'
import { Dialogue } from '../components/ui/Dialogue'
import { Seo } from '../components/ui/Seo'
import { useAsync } from '../hooks/useAsync'
import { getStudio } from '../services/content'
import { formatDate } from '../utils/format'

const MANIFESTO =
  'We believe a home should be cooler than the street and warmer than the people who visit it. We keep what already works, build with lime, teak, granite and clay, and draw every room around where the breeze and the morning light come in. We design for three generations — and for the paati who will tell us exactly what we got wrong.'

export default function Studio() {
  const state = useAsync(getStudio, [])
  if (state.status === 'loading') return <PageLoading />
  if (state.status === 'error') return <PageError message={state.error.message} />
  const { team, principles, process, history, press } = state.data

  return (
    <>
      <Seo title="Studio" description="The manifesto, people, principles and process behind Mami’s Interior — a fictional architecture and interior design studio." />
      <section className="container-wide pt-36 pb-20 md:pt-44">
        <Breadcrumbs items={[{ label: 'Studio' }]} />
        <SplitHeadline text="Homes with a thinnai and a story." className="mt-8 max-w-[14ch] font-serif text-display" />
        <Dialogue id="studio" className="mt-8" />
      </section>

      <section className="container-wide grid gap-6 pb-24 md:grid-cols-12">
        <ImageReveal className="md:col-span-8">
          <Picture image={{ src: '/images/renders/halden-studio', alt: 'Studio interior with a long oak table, timber wall and shelving', ratio: 1.6 }} sizes="(min-width: 768px) 66vw, 100vw" priority />
        </ImageReveal>
        <ImageReveal className="md:col-span-4 md:mt-32" delay={0.15}>
          <Picture image={{ src: '/images/renders/halden-materials', alt: 'Material samples laid out on a walnut table', ratio: 0.769 }} sizes="(min-width: 768px) 33vw, 100vw" />
        </ImageReveal>
        <SampleNote className="md:col-span-12">Studio imagery is a Blender visualisation of the Kaapi Labs office study, used here to illustrate the studio.</SampleNote>
      </section>

      <Manifesto />

      <section className="container-wide grid gap-16 py-28 md:py-36 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading eyebrow="Philosophy" title="Old wisdom, new plumbing." />
        </div>
        <div className="space-y-6 text-[1.05rem] leading-relaxed text-charcoal/75 lg:col-span-6 lg:col-start-7">
          <Reveal>
            <p>
              Our work begins with what is already there — a plot, an old house, a 2BHK flat. We study where the sun and
              the monsoon come from, how the family moves through the day, and what is worth keeping. Only then do we
              propose what to add.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p>
              We prefer materials that improve with age and can be repaired: granite, teak, lime, Athangudi tiles and brass
              that patinates. A courtyard and a deep verandah do more for comfort than any gadget we could specify.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <p>
              Architecture, interiors and visualisation share one team and one 3D model, so the building, its rooms and
              its images never drift apart.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-ivory-deep py-28 md:py-36">
        <div className="container-wide">
          <SectionHeading eyebrow="Principles" title="Five rules we try not to break." />
          <ol className="mt-16 grid gap-px bg-charcoal/10 md:grid-cols-2 lg:grid-cols-5">
            {principles.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 0.06} className="list-none bg-ivory-deep p-8">
                  <span className="font-serif text-[3rem] leading-none text-olive">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-8 font-serif text-[1.6rem] leading-tight">{p.title}</h3>
                  <p className="mt-4 text-[0.92rem] text-charcoal/70">{p.text}</p>
                </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-wide grid gap-16 py-28 md:py-36 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeading eyebrow="History" title="A decade, briefly." />
          <SampleNote className="mt-8">The studio is fictional; this timeline is sample content.</SampleNote>
        </div>
        <ol className="relative border-l border-charcoal/20 pl-8 lg:col-span-7 lg:col-start-6">
          {history.map((h, i) => (
            <Reveal as="li" key={h.year} delay={i * 0.06} className="relative list-none pb-12 last:pb-0">
                <span aria-hidden className="absolute top-2 -left-[37px] size-2.5 rounded-full bg-olive" />
                <p className="font-serif text-[2.4rem] leading-none">{h.year}</p>
                <p className="mt-3 max-w-lg text-charcoal/70">{h.text}</p>
              </Reveal>
          ))}
        </ol>
      </section>

      <section className="border-t border-charcoal/10 py-28 md:py-36">
        <div className="container-wide">
          <SectionHeading eyebrow="People" title="The team" intro="Fictional profiles for this demonstration studio." />
          <ul className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m, i) => (
              <Reveal as="li" key={m.id} delay={i * 0.08} className="list-none">
                  <div aria-hidden className="grid aspect-[4/5] place-items-center bg-charcoal text-ivory">
                    <span className="font-serif text-[5rem] tracking-wide text-stone">{m.initials}</span>
                  </div>
                  <h3 className="mt-5 font-serif text-[1.6rem]">{m.name}</h3>
                  <p className="eyebrow mt-1 text-olive">{m.role}</p>
                  <p className="mt-4 text-[0.92rem] text-charcoal/70">{m.bio}</p>
                </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="on-dark bg-charcoal py-28 text-ivory md:py-36">
        <div className="container-wide grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow className="mb-6 text-stone">Project lifecycle</Eyebrow>
            <h2 className="font-serif text-headline">From first call to handover.</h2>
            <Parallax className="mt-12 hidden aspect-[4/5] lg:block" amount={12}>
              <Picture image={{ src: '/images/drawings/mutram-plan', alt: 'Courtyard house plan drawing', ratio: 1.6 }} fill sizes="30vw" className="opacity-80 invert" />
            </Parallax>
          </div>
          <ol className="space-y-px lg:col-span-7 lg:col-start-6">
            {process.map((s) => (
              <Reveal as="li" key={s.number} className="grid list-none gap-4 border-t border-ivory/15 py-8 sm:grid-cols-[90px_1fr_140px]">
                  <span className="font-serif text-[2.4rem] leading-none text-stone">{s.number}</span>
                  <div>
                    <h3 className="font-serif text-[1.7rem]">{s.title}</h3>
                    <p className="mt-2 text-ivory/70">{s.text}</p>
                  </div>
                  <span className="eyebrow text-ivory/50 sm:text-right">{s.duration}</span>
                </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-wide py-28 md:py-36">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow="Recognition" title="Awards & publications" />
          <ButtonLink to="/recognition" variant="outline">
            All recognition
          </ButtonLink>
        </div>
        <ul className="grid gap-6 md:grid-cols-3">
          {press.slice(0, 3).map((p) => (
            <li key={p.id} className="border-t border-charcoal/20 pt-6">
              <p className="eyebrow text-olive">
                {p.kind} · {formatDate(p.date, { year: 'numeric' })}
              </p>
              <p className="mt-3 font-serif text-[1.5rem] leading-tight">{p.title}</p>
              <p className="mt-2 text-[0.9rem] text-charcoal/60">{p.outlet}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-stone/25 py-24">
        <div className="container-wide grid gap-10 md:grid-cols-2 md:items-end">
          <div>
            <Eyebrow className="mb-6 text-olive-deep">Careers &amp; collaboration</Eyebrow>
            <h2 className="font-serif text-headline">Work with us.</h2>
          </div>
          <div className="space-y-6">
            <p className="text-charcoal/75">
              We are always glad to hear from architects, interior designers, visualisers and makers. Send a short note and a
              portfolio link through the contact form.
            </p>
            <Link to="/contact?subject=Careers" className="eyebrow link-underline">
              Send a careers or collaboration enquiry
            </Link>
          </div>
        </div>
      </section>

      <ConsultationCta />
    </>
  )
}

/** Words brighten one by one as the manifesto scrolls through the viewport. */
function Manifesto() {
  const ref = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.manifesto-word',
          { opacity: 0.16 },
          {
            opacity: 1,
            stagger: 0.05,
            ease: 'none',
            scrollTrigger: { trigger: ref.current, start: 'top 75%', end: 'bottom 55%', scrub: true },
          },
        )
      })
      return () => mm.revert()
    },
    { scope: ref },
  )
  return (
    <section ref={ref} className="on-dark bg-charcoal py-28 text-ivory md:py-40">
      <div className="container-wide">
        <Eyebrow className="mb-10 text-stone">Manifesto</Eyebrow>
        <p className="max-w-5xl font-serif text-[clamp(2rem,4.4vw,4.2rem)] leading-[1.12]" aria-label={MANIFESTO}>
          {MANIFESTO.split(' ').map((w, i) => (
            <span key={i} aria-hidden className="manifesto-word">
              {w}{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}
