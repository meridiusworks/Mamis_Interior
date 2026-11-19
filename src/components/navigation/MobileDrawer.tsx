import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { site } from '../../config/site'
import { Dialog } from '../ui/Dialog'
import { Logo } from '../ui/Misc'
import { primaryNav, studioMenu } from './nav'

const ease = [0.22, 1, 0.36, 1] as const

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const links = [
    ...primaryNav,
    ...studioMenu.filter((s) => s.to !== '/studio').map((s) => ({ label: s.label, to: s.to })),
    { label: 'Start a project', to: '/consultation' },
  ]
  return (
    <Dialog open={open} onClose={onClose} label="Site menu" className="on-dark relative flex h-full flex-col overflow-y-auto text-ivory outline-none">
      <div id="mobile-menu" className="container-wide flex h-[72px] items-center justify-between">
        <Logo />
        <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-full p-2">
          <X aria-hidden className="size-6" />
        </button>
      </div>
      <nav aria-label="Mobile" className="container-wide flex-1 py-8">
        <ul className="space-y-1">
          {links.map((item, i) => (
            <motion.li
              key={item.to}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease, delay: 0.05 + i * 0.04 }}
            >
              <NavLink
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `block py-1.5 font-serif text-[2.4rem] leading-tight transition-colors ${isActive ? 'text-stone' : 'text-ivory hover:text-stone'}`
                }
              >
                {item.label}
              </NavLink>
            </motion.li>
          ))}
        </ul>
      </nav>
      <div className="container-wide space-y-1 border-t border-ivory/15 py-8 text-sm text-ivory/70">
        <a href={`mailto:${site.contact.email}`} className="block hover:text-ivory">
          {site.contact.email}
        </a>
        <a href={site.contact.phoneHref} className="block hover:text-ivory">
          {site.contact.phone}
        </a>
      </div>
    </Dialog>
  )
}
