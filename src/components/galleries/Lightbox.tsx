import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ImageRef } from '../../types/content'
import { Dialog } from '../ui/Dialog'

/** Fullscreen image viewer: arrows, keyboard (←/→/Esc) and swipe. */
export function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: ImageRef[]
  index: number | null
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const touchX = useRef<number | null>(null)
  const open = index !== null
  const current = open ? images[index] : null
  const go = (delta: number) => index !== null && onIndexChange((index + delta + images.length) % images.length)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <Dialog open={open} onClose={onClose} label="Image viewer" className="on-dark relative flex h-full w-full flex-col text-ivory outline-none">
      <div className="flex items-center justify-between px-4 py-4 sm:px-8">
        <p className="text-xs tracking-[0.16em] uppercase tabular-nums text-ivory/70" aria-live="polite">
          {index !== null && `${index + 1} / ${images.length}`}
        </p>
        <button type="button" onClick={onClose} aria-label="Close image viewer" className="rounded-full p-2 hover:bg-ivory/10">
          <X aria-hidden className="size-6" />
        </button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {current && (
            <motion.figure
              key={current.src}
              className="flex max-h-full flex-col items-center"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <img src={`${current.src}.webp`} alt={current.alt} className="max-h-[78vh] w-auto max-w-full object-contain" />
              {current.caption && <figcaption className="mt-4 text-center text-sm text-ivory/70">{current.caption}</figcaption>}
            </motion.figure>
          )}
        </AnimatePresence>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute top-1/2 left-2 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-ivory/25 hover:bg-ivory hover:text-charcoal sm:left-6"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute top-1/2 right-2 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-ivory/25 hover:bg-ivory hover:text-charcoal sm:right-6"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </>
        )}
      </div>
      <div className="h-6 shrink-0" />
    </Dialog>
  )
}
