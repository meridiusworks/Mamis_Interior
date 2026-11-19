import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { PageLoading } from '../ui/Misc'
import { Header } from '../navigation/Header'
import { Cursor } from './Cursor'
import { Footer } from './Footer'
import { ScrollTrigger } from '../animations/Parallax'

const ease = [0.22, 1, 0.36, 1] as const

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function scrollAfterNavigation(hash: string) {
  if (hash) {
    // Pages that load content asynchronously scroll to their own anchors once
    // it renders, so never reset to the top when a hash is present.
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'auto' })
    return
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

export function SiteLayout() {
  const location = useLocation()

  // Same page, different hash (e.g. services mega menu): just scroll.
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)))
      el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
  }, [location.hash])

  return (
    <MotionConfig reducedMotion="user">
      <Header />
      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={() => {
          scrollAfterNavigation(location.hash)
          requestAnimationFrame(() => ScrollTrigger.refresh())
        }}
      >
        <motion.main
          id="main"
          key={location.pathname}
          tabIndex={-1}
          className="min-h-screen outline-none"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease } }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          <Suspense fallback={<PageLoading />}>
            <FrozenOutlet />
          </Suspense>
        </motion.main>
      </AnimatePresence>
      <Footer />
      <ScrollToTop />
      <Cursor />
    </MotionConfig>
  )
}

/** Keeps the outgoing page's content while it animates out. */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

function ScrollToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 900)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          aria-label="Scroll to top"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })}
          className="fixed right-4 bottom-4 z-40 grid size-11 place-items-center rounded-full bg-charcoal text-ivory shadow-lg transition-colors hover:bg-olive-deep sm:right-6 sm:bottom-6"
        >
          <ArrowUp aria-hidden className="size-4" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
