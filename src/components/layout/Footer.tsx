import { Link } from 'react-router-dom'
import { site } from '../../config/site'
import { NewsletterForm } from '../forms/NewsletterForm'
import { Dialogue } from '../ui/Dialogue'
import { footerNav } from '../navigation/nav'

export function Footer() {
  const socials = site.social.filter((s) => s.url)
  return (
    <footer className="on-dark bg-charcoal text-ivory">
      <div className="container-wide grid gap-14 pt-24 pb-10 lg:grid-cols-[1.3fr_2fr]">
        <div className="space-y-10">
          <p className="max-w-sm font-serif text-[2rem] leading-tight">
            South Indian homes shaped by light, breeze, monsoon — and the way families live.
          </p>
          <Dialogue id="footer" size="sm" tone="dark" />
          <div className="max-w-sm">
            <NewsletterForm />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {footerNav.map((col) => (
            <nav key={col.title} aria-label={`Footer — ${col.title}`}>
              <p className="eyebrow mb-5 text-stone">{col.title}</p>
              <ul className="space-y-2.5 text-[0.92rem] text-ivory/75">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="link-underline hover:text-ivory">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <p className="eyebrow mb-5 text-stone">Contact</p>
            <ul className="space-y-2.5 text-[0.92rem] text-ivory/75">
              <li>
                <a href={`mailto:${site.contact.email}`} className="link-underline break-all hover:text-ivory">
                  {site.contact.email}
                </a>
              </li>
              <li>
                <a href={site.contact.phoneHref} className="link-underline hover:text-ivory">
                  {site.contact.phone}
                </a>
              </li>
              <li className="text-ivory/50">{site.contact.address ? `${site.contact.address.city}, ${site.contact.address.country}` : site.contact.region}</li>
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.url!} target="_blank" rel="noreferrer" className="link-underline hover:text-ivory">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="container-wide overflow-hidden">
        <p aria-hidden className="font-display text-[clamp(2rem,8.6vw,9.5rem)] leading-[0.9] font-bold tracking-[0.01em] whitespace-nowrap text-ivory/[0.07] select-none">
          {site.wordmark}
        </p>
      </div>
      <div className="container-wide flex flex-col gap-3 border-t border-ivory/10 py-6 text-[0.72rem] text-ivory/45 md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} {site.name}. A fictional studio — projects, people and recognition on this site are
          sample content.
        </p>
        <p>Renderings and 3D models generated in Blender for this portfolio.</p>
      </div>
    </footer>
  )
}
