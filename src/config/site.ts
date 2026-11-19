/**
 * Brand and business configuration — the single place to rename the studio,
 * change contact details or connect real channels.
 *
 * Everything here is a placeholder for a fictional Chennai studio. The email
 * uses the reserved `.example` domain and the phone number the reserved
 * 555-01xx range, so nothing points at a real person or business until you
 * replace it.
 */
export const site = {
  name: 'Mami’s Interior',
  wordmark: 'MAMI’S INTERIOR',
  monogram: 'MI',
  tagline: 'South Indian Homes & Interiors',
  description:
    'Mami’s Interior is a fictional Chennai architecture and interior design studio for South Indian homes — thinnai, mutram, oonjal and all. A portfolio demonstration built with React, Three.js and Blender.',
  url: import.meta.env.VITE_SITE_URL ?? 'https://mamisinterior.example',
  locale: 'en-IN',

  contact: {
    email: 'vanakkam@mamisinterior.example',
    phone: '+1 555 0142',
    phoneHref: 'tel:+15550142',
    // A real address is intentionally absent. Add one here and it appears on
    // the contact page, in the footer and in the structured data.
    address: null as null | { street: string; city: string; postcode: string; country: string },
    region: 'Chennai, Tamil Nadu — exact address shared on appointment',
    hours: [
      { days: 'Monday – Friday', time: '10:00 – 19:00' },
      { days: 'Saturday', time: '10:00 – 14:00' },
      { days: 'Sunday', time: 'Family day — phone on silent' },
    ],
    responseTime: 'We reply to new enquiries within two working days (festival weeks may take a little longer).',
    // Paste an embeddable map URL (e.g. an OpenStreetMap export link) to show a map.
    mapEmbedUrl: null as null | string,
  },

  // Social channels render only when a URL is present.
  social: [
    { label: 'Instagram', url: null as null | string },
    { label: 'YouTube', url: null as null | string },
    { label: 'LinkedIn', url: null as null | string },
  ],

  /**
   * Form delivery. With no endpoint configured every form runs in demo mode:
   * input is validated in the browser and nothing is transmitted or stored.
   */
  forms: {
    endpoint: (import.meta.env.VITE_FORMS_ENDPOINT as string | undefined) || null,
  },
} as const

export type SiteConfig = typeof site

export const isDemoForms = !site.forms.endpoint
