import { useSearchParams } from 'react-router-dom'
import { ConsultationForm } from '../components/forms/ConsultationForm'
import { Breadcrumbs, Eyebrow, PageError, PageLoading } from '../components/ui/Misc'
import { Picture } from '../components/ui/Picture'
import { Reveal, SplitHeadline } from '../components/ui/Reveal'
import { Seo } from '../components/ui/Seo'
import { site } from '../config/site'
import { useAsync } from '../hooks/useAsync'
import { getServices } from '../services/content'

const OPTIONS = [
  { title: 'Design consultation', length: '2 hours', text: 'A focused working session on a plan, a room or a decision — in person or by video.' },
  { title: 'Project discovery', length: 'Half day', text: 'A site or building visit, brief workshop and written summary of options and next steps.' },
  { title: 'Remote review', length: '1 hour', text: 'We review drawings or photographs you send in advance and talk through our recommendations.' },
]

const STEPS = [
  { title: 'Send a request', text: 'Tell us about the project, your budget range and when you would like to meet.' },
  { title: 'We review it', text: 'A member of the team reads every request and checks the fit with our current work.' },
  { title: 'We confirm a time', text: 'We reply by email with an available slot and any questions — nothing is booked until then.' },
  { title: 'We meet', text: 'At the studio, on site or by video. You receive a written summary afterwards.' },
]

export default function Consultation() {
  const [params] = useSearchParams()
  const services = useAsync(getServices, [])

  return (
    <>
      <Seo title="Consultation" description="Request a design consultation with Mami’s Interior — tell us about your project, budget, timeline and preferred meeting time." />
      <section className="container-wide pt-36 pb-16 md:pt-44">
        <Breadcrumbs items={[{ label: 'Consultation' }]} />
        <SplitHeadline text="Start a project." className="mt-8 font-serif text-display" />
        <p className="mt-8 max-w-xl text-[1.05rem] text-charcoal/70">
          Every project begins with a conversation. Choose the kind of consultation that suits you and send a request —
          it takes about four minutes.
        </p>
      </section>

      <section className="container-wide grid gap-6 pb-20 md:grid-cols-3">
        {OPTIONS.map((o, i) => (
          <Reveal key={o.title} delay={i * 0.08} className="border-t border-charcoal/20 pt-6">
            <p className="eyebrow text-olive">{o.length}</p>
            <h2 className="mt-3 font-serif text-[1.8rem]">{o.title}</h2>
            <p className="mt-3 text-[0.92rem] text-charcoal/70">{o.text}</p>
          </Reveal>
        ))}
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="container-wide grid gap-16 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <Eyebrow className="mb-6 text-olive">How it works</Eyebrow>
              <ol className="space-y-6">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="grid grid-cols-[32px_1fr] gap-3">
                    <span className="font-serif text-[1.6rem] leading-none text-olive">{i + 1}</span>
                    <span>
                      <strong className="block font-medium">{s.title}</strong>
                      <span className="text-[0.9rem] text-charcoal/65">{s.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-8 text-[0.85rem] text-charcoal/60">{site.contact.responseTime}</p>
              <div className="mt-10 hidden lg:block">
                <Picture image={{ src: '/images/renders/halden-table', alt: 'Long oak meeting table in the studio', ratio: 1.6 }} sizes="30vw" />
              </div>
            </div>
          </aside>
          <div className="lg:col-span-7 lg:col-start-6">
            {services.status === 'loading' && <PageLoading label="Loading form" />}
            {services.status === 'error' && <PageError message={services.error.message} />}
            {services.status === 'success' && <ConsultationForm services={services.data} initialService={params.get('service') ?? undefined} />}
          </div>
        </div>
      </section>
    </>
  )
}
