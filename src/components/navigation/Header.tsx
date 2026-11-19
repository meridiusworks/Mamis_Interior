import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, ChevronDown, Menu } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { site } from '../../config/site'
import { useAsync } from '../../hooks/useAsync'
import { getProjects, getServices } from '../../services/content'
import { cn } from '../../utils/format'
import { Picture } from '../ui/Picture'
import { Logo } from '../ui/Misc'
import { MobileDrawer } from './MobileDrawer'
import { primaryNav, projectCategories, studioMenu, type NavItem } from './nav'

const ease = [0.22, 1, 0.36, 1] as const

/** Routes that open on a full-bleed dark hero; the header starts transparent there. */
function hasDarkHero(pathname: string) {
  return pathname === '/' || pathname === '/experience' || /^\/projects\/[^/]+$/.test(pathname)
}

export function Header() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState<NavItem['menu'] | null>(null)
  const [drawer, setDrawer] = useState(false)
  const closeTimer = useRef<number>(undefined)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menus on navigation (state adjusted during render, not in an effect).
  const [shownPath, setShownPath] = useState(pathname)
  if (shownPath !== pathname) {
    setShownPath(pathname)
    setOpen(null)
    setDrawer(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const transparent = hasDarkHero(pathname) && !scrolled && !open
  const light = transparent

  const enter = (menu: NavItem['menu'] | null) => {
    window.clearTimeout(closeTimer.current)
    setOpen(menu ?? null)
  }
  const leave = () => {
    closeTimer.current = window.setTimeout(() => setOpen(null), 160)
  }

  return (
    <>
      <a
        href="#main"
        className="fixed top-2 left-2 z-[100] -translate-y-20 rounded-full bg-charcoal px-4 py-2 text-sm text-ivory focus:translate-y-0"
      >
        Skip to content
      </a>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,color,box-shadow] duration-500',
          light ? 'on-dark text-ivory' : 'bg-ivory/92 text-charcoal shadow-[0_1px_0_rgba(23,23,21,0.08)] backdrop-blur-md',
        )}
        onMouseLeave={leave}
      >
        <div className="container-wide flex h-[72px] items-center justify-between gap-6">
          <Link to="/" aria-label={`${site.name} — home`} className="shrink-0">
            <Logo />
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-7 xl:gap-9">
              {primaryNav.map((item) => (
                <li key={item.to} onMouseEnter={() => enter(item.menu ?? null)}>
                  <div className="flex items-center gap-1">
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      className="link-underline py-2 text-[0.82rem] tracking-[0.04em] whitespace-nowrap"
                      onFocus={() => enter(null)}
                    >
                      {item.label}
                    </NavLink>
                    {item.menu && (
                      <button
                        type="button"
                        aria-expanded={open === item.menu}
                        aria-controls={`menu-${item.menu}`}
                        aria-label={`${item.label} menu`}
                        className="rounded-full p-1"
                        onClick={() => setOpen(open === item.menu ? null : item.menu!)}
                      >
                        <ChevronDown
                          aria-hidden
                          className={cn('size-3.5 transition-transform duration-300', open === item.menu && 'rotate-180')}
                        />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/consultation"
              className={cn(
                'group hidden items-center gap-2 rounded-full px-5 py-2.5 text-[0.72rem] font-medium tracking-[0.16em] uppercase transition-colors duration-500 sm:inline-flex',
                light ? 'bg-ivory text-charcoal hover:bg-white' : 'bg-charcoal text-ivory hover:bg-olive-deep',
              )}
            >
              Start a project
              <ArrowUpRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full p-2 lg:hidden"
              aria-label="Open menu"
              aria-expanded={drawer}
              aria-controls="mobile-menu"
              onClick={() => setDrawer(true)}
            >
              <Menu aria-hidden className="size-6" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              id={`menu-${open}`}
              key={open}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 top-full hidden border-t border-charcoal/10 bg-ivory text-charcoal shadow-[0_30px_60px_-30px_rgba(23,23,21,0.35)] lg:block"
              onMouseEnter={() => enter(open)}
            >
              <div className="container-wide py-10">
                {open === 'projects' && <ProjectsMenu />}
                {open === 'services' && <ServicesMenu />}
                {open === 'studio' && <StudioMenu />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />
    </>
  )
}

function ProjectsMenu() {
  const projects = useAsync(getProjects, [])
  const featured = projects.data?.filter((p) => p.featured).slice(0, 3) ?? []
  return (
    <div className="grid grid-cols-[1fr_3fr] gap-12">
      <div>
        <p className="eyebrow mb-5 text-olive">By category</p>
        <ul className="space-y-2.5">
          <li>
            <Link to="/projects" className="link-underline font-serif text-2xl">
              All projects
            </Link>
          </li>
          {projectCategories.map((c) => (
            <li key={c}>
              <Link to={`/projects?category=${encodeURIComponent(c)}`} className="link-underline text-[0.95rem] text-charcoal/75 hover:text-charcoal">
                {c}
              </Link>
            </li>
          ))}
          <li className="pt-3">
            <Link to="/transformations" className="link-underline text-[0.95rem] text-charcoal/75 hover:text-charcoal">
              Before &amp; after
            </Link>
          </li>
        </ul>
      </div>
      <ul className="grid grid-cols-3 gap-6">
        {featured.map((p) => (
          <li key={p.slug}>
            <Link to={`/projects/${p.slug}`} className="group block">
              <div className="overflow-hidden">
                <Picture
                  image={p.cover}
                  sizes="25vw"
                  className="transition-transform duration-[1.2s] ease-[var(--ease-architect)] group-hover:scale-[1.04]"
                />
              </div>
              <p className="mt-3 font-serif text-xl">{p.title}</p>
              <p className="text-[0.78rem] text-charcoal/60">
                {p.location} · {p.year}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ServicesMenu() {
  const services = useAsync(getServices, [])
  return (
    <div className="grid grid-cols-[1fr_3fr] gap-12">
      <div>
        <p className="eyebrow mb-5 text-olive">Services</p>
        <p className="max-w-xs text-charcoal/70">Ten ways to work with the studio — from a single consultation to a complete building.</p>
        <Link to="/services" className="link-underline mt-6 inline-block font-serif text-2xl">
          All services
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-x-10 gap-y-1">
        {services.data?.map((s) => (
          <li key={s.slug}>
            <Link to={`/services#${s.slug}`} className="group flex items-baseline gap-4 border-b border-charcoal/10 py-3">
              <span className="text-[0.72rem] text-olive tabular-nums">{s.number}</span>
              <span className="link-underline text-[0.98rem]">{s.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StudioMenu() {
  return (
    <ul className="grid grid-cols-4 gap-8">
      {studioMenu.map((item) => (
        <li key={item.to}>
          <Link to={item.to} className="group block border-t border-charcoal/15 pt-5">
            <span className="link-underline font-serif text-2xl">{item.label}</span>
            <span className="mt-2 block text-[0.85rem] text-charcoal/60">{item.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
