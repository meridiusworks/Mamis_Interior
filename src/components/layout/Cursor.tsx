import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useFinePointer, usePrefersReducedMotion } from '../../hooks/useMediaQuery'

/**
 * Desktop-only follower ring. Elements with `data-cursor="Label"` expand it
 * and show the label (e.g. "View" on project cards). The native cursor stays
 * visible, so nothing depends on this for usability.
 */
export function Cursor() {
  const fine = useFinePointer()
  const reduced = usePrefersReducedMotion()
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 })
  const [label, setLabel] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!fine || reduced) return
    const move = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setVisible(true)
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cursor]')
      setLabel(target?.dataset.cursor ?? null)
    }
    const leave = () => setVisible(false)
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [fine, reduced, x, y])

  if (!fine || reduced) return null

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[90] mix-blend-difference"
      style={{ x: sx, y: sy, opacity: visible ? 1 : 0 }}
    >
      <motion.div
        className="flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white text-[0.62rem] font-medium tracking-[0.18em] text-white uppercase"
        animate={{ width: label ? 84 : 26, height: label ? 84 : 26, backgroundColor: label ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        {label && <span className="text-black">{label}</span>}
      </motion.div>
    </motion.div>
  )
}
