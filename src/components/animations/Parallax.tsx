import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef, type ReactNode } from 'react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * Scroll-linked parallax for photography. The child is drawn slightly taller
 * than its frame and drifts as the frame crosses the viewport. Disabled for
 * reduced motion.
 */
export function Parallax({ children, amount = 12, className }: { children: ReactNode; amount?: number; className?: string }) {
  const frame = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          inner.current,
          // Slightly less than the overscan so the frame edge is never exposed.
          { yPercent: -amount / 2.6 },
          {
            yPercent: amount / 2.6,
            ease: 'none',
            scrollTrigger: { trigger: frame.current, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        )
      })
      return () => mm.revert()
    },
    { scope: frame },
  )

  return (
    <div ref={frame} className={`relative overflow-hidden ${className ?? ''}`}>
      <div ref={inner} className="absolute inset-x-0" style={{ top: `-${amount / 2}%`, bottom: `-${amount / 2}%` }}>
        {children}
      </div>
    </div>
  )
}

export { gsap, ScrollTrigger }
