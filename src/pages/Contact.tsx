import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ContactForm } from '../components/forms/ContactForm'
import { Breadcrumbs, Eyebrow, SampleNote } from '../components/ui/Misc'
import { Picture } from '../components/ui/Picture'
import { ImageReveal, SplitHeadline } from '../components/ui/Reveal'
import { Dialogue } from '../components/ui/Dialogue'
import { Seo, studioJsonLd } from '../components/ui/Seo'
import { site } from '../config/site'

export default function Contact() {
  const [params] = useSearchParams()
  const { contact } = site
  const socials = site.social.filter((s) => s.url)

  return (
    <>
      <Seo title="Contact" description="Contact the Mami’s Interior studio — email, telephone, working hours and a project enquiry form." jsonLd={studioJsonLd()} />
      <section className="container-wide pt-36 pb-16 md:pt-44">
        <Breadcrumbs items={[{ label: 'Contact' }]} />
        <SplitHeadline text="Vanakkam!" className="mt-8 font-serif text-display" />
        <Dialogue id="contact" className="mt-8" />
      </section>

      <section className="container-wide grid gap-16 pb-24 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-5">
          <ImageReveal>
            <Picture image={{ src: '/images/renders/mutram-door', alt: 'Carved teak door with brass studs and a kolam on the red oxide floor', ratio: 0.769 }} sizes="(min-width: 1024px) 40vw, 100vw" priority />
          </ImageReveal>

          <dl className="space-y-7">
            <div className="flex gap-4">
              <Mail aria-hidden className="mt-1 size-4 text-olive" />
              <div>
                <dt className="eyebrow text-charcoal/55">Email</dt>
                <dd className="mt-1 text-[1.1rem]">
                  <a href={`mailto:${contact.email}`} className="link-underline">
                    {contact.email}
                  </a>
                </dd>
              </div>
            </div>
            <div className="flex gap-4">
              <Phone aria-hidden className="mt-1 size-4 text-olive" />
              <div>
                <dt className="eyebrow text-charcoal/55">Telephone</dt>
                <dd className="mt-1 text-[1.1rem]">
                  <a href={contact.phoneHref} className="link-underline">
                    {contact.phone}
                  </a>
                </dd>
              </div>
            </div>
            <div className="flex gap-4">
              <MapPin aria-hidden className="mt-1 size-4 text-olive" />
              <div>
                <dt className="eyebrow text-charcoal/55">Studio</dt>
                <dd className="mt-1">
                  {contact.address ? (
                    <address className="not-italic">
                      {contact.address.street}
                      <br />
                      {contact.address.postcode} {contact.address.city}
                      <br />
                      {contact.address.country}
                    </address>
                  ) : (
                    <span className="text-charcoal/70">{contact.region}. Meetings by video, on site or by arrangement.</span>
                  )}
                </dd>
              </div>
            </div>
            <div className="flex gap-4">
              <Clock aria-hidden className="mt-1 size-4 text-olive" />
              <div>
                <dt className="eyebrow text-charcoal/55">Working hours</dt>
                <dd className="mt-1">
                  <ul className="space-y-1 text-[0.95rem]">
                    {contact.hours.map((h) => (
                      <li key={h.days} className="flex justify-between gap-8">
                        <span className="text-charcoal/65">{h.days}</span>
                        <span className="tabular-nums">{h.time}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </div>
          </dl>

          {socials.length > 0 && (
            <div>
              <Eyebrow className="mb-4 text-charcoal/55">Follow</Eyebrow>
              <ul className="flex gap-6">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.url!} target="_blank" rel="noreferrer" className="link-underline">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contact.mapEmbedUrl ? (
            <iframe title="Studio location map" src={contact.mapEmbedUrl} className="aspect-[4/3] w-full border-0" loading="lazy" />
          ) : (
            <SampleNote>
              Contact details are placeholders for a fictional studio (a reserved <code>.example</code> email and a 555
              number). Add a real address and map link in <code>src/config/site.ts</code> to show them here.
            </SampleNote>
          )}
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <Eyebrow className="mb-6 text-olive">Project enquiry</Eyebrow>
          <h2 className="mb-4 font-serif text-title">Tell us what you are planning.</h2>
          <p className="mb-12 text-charcoal/70">{contact.responseTime} For a structured brief, use the consultation form instead.</p>
          <ContactForm initialSubject={params.get('subject') ?? undefined} />
        </div>
      </section>
    </>
  )
}
