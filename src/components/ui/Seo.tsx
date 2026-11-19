import { useLocation } from 'react-router-dom'
import { site } from '../../config/site'

interface SeoProps {
  title?: string
  description?: string
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
  jsonLd?: Record<string, unknown>
}

/**
 * Page metadata. React 19 hoists <title>, <meta> and <link> into <head>, so
 * each route can declare its own without a helmet library.
 */
export function Seo({ title, description = site.description, image, type = 'website', noindex, jsonLd }: SeoProps) {
  const { pathname } = useLocation()
  const fullTitle = title ? `${title} — ${site.name}` : `${site.name} — ${site.tagline}`
  const url = `${site.url}${pathname === '/' ? '' : pathname}`
  const ogImage = `${site.url}${image ?? '/images/renders/mutram-exterior-dusk'}.webp`
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex" />}
      <meta property="og:site_name" content={site.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </>
  )
}

/** Organisation markup for the studio; only includes fields that are configured. */
export function studioJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    additionalType: 'https://schema.org/HomeAndConstructionBusiness',
    name: site.name,
    description: site.description,
    url: site.url,
    email: site.contact.email,
    telephone: site.contact.phone,
    image: `${site.url}/images/renders/mutram-exterior-dusk.webp`,
    knowsAbout: ['Architecture', 'Interior design', 'Renovation', '3D visualization'],
    ...(site.contact.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: site.contact.address.street,
        addressLocality: site.contact.address.city,
        postalCode: site.contact.address.postcode,
        addressCountry: site.contact.address.country,
      },
    }),
  }
}
