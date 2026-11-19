export interface NavItem {
  label: string
  to: string
  menu?: 'projects' | 'services' | 'studio'
}

export const primaryNav: NavItem[] = [
  { label: 'Projects', to: '/projects', menu: 'projects' },
  { label: 'Studio', to: '/studio', menu: 'studio' },
  { label: 'Services', to: '/services', menu: 'services' },
  { label: '3D Experience', to: '/experience' },
  { label: 'Materials', to: '/materials' },
  { label: 'Journal', to: '/journal' },
]

export const projectCategories = [
  'Residential',
  'Commercial',
  'Hospitality',
  'Interior Design',
  'Renovation',
  'Architecture',
] as const

export const studioMenu = [
  { label: 'About the studio', to: '/studio', text: 'Manifesto, people and process' },
  { label: 'Recognition', to: '/recognition', text: 'Awards, press and interviews' },
  { label: 'Transformations', to: '/transformations', text: 'Before-and-after studies' },
  { label: 'Contact', to: '/contact', text: 'Studio details and enquiries' },
]

export const footerNav = [
  {
    title: 'Work',
    links: [
      { label: 'Projects', to: '/projects' },
      { label: 'Transformations', to: '/transformations' },
      { label: '3D Experience', to: '/experience' },
      { label: 'Materials', to: '/materials' },
    ],
  },
  {
    title: 'Studio',
    links: [
      { label: 'About', to: '/studio' },
      { label: 'Services', to: '/services' },
      { label: 'Recognition', to: '/recognition' },
      { label: 'Journal', to: '/journal' },
    ],
  },
  {
    title: 'Start',
    links: [
      { label: 'Consultation', to: '/consultation' },
      { label: 'Contact', to: '/contact' },
    ],
  },
]
