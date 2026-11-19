import { ChevronsLeftRight, ImageOff } from 'lucide-react'
import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { ImageRef } from '../../types/content'
import { cn } from '../../utils/format'

/**
 * Draggable comparison slider. Pointer (mouse, pen, touch) drags the divider;
 * the handle is a focusable ARIA slider driven by arrow keys, Home and End.
 * Both images must share the same dimensions (they come from one Blender camera).
 */
export function BeforeAfter({
  before,
  after,
  label,
  className,
  initial = 50,
}: {
  before?: ImageRef
  after?: ImageRef
  label: string
  className?: string
  initial?: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(initial)
  const [dragging, setDragging] = useState(false)
  const [failed, setFailed] = useState(false)

  const fromPointer = useCallback((clientX: number) => {
    const rect = box.current?.getBoundingClientRect()
    if (!rect) return
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)))
  }, [])

  if (!before || !after || failed) {
    return (
      <div className={cn('flex aspect-[16/10] flex-col items-center justify-center gap-3 bg-ivory-deep text-center text-charcoal/60', className)}>
        <ImageOff aria-hidden className="size-6" />
        <p className="max-w-xs text-sm">Comparison images are not available for this study.</p>
        {after && !failed && <img src={`${after.src}.webp`} alt={after.alt} className="mt-2 max-h-40" />}
      </div>
    )
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    fromPointer(e.clientX)
  }
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2
    const map: Record<string, number> = { ArrowLeft: pos - step, ArrowDown: pos - step, ArrowRight: pos + step, ArrowUp: pos + step, Home: 0, End: 100 }
    if (e.key in map) {
      e.preventDefault()
      setPos(Math.min(100, Math.max(0, map[e.key])))
    }
  }

  return (
    <div
      ref={box}
      className={cn('relative w-full touch-pan-y overflow-hidden select-none', dragging ? 'cursor-grabbing' : 'cursor-ew-resize', className)}
      style={{ aspectRatio: after.ratio ?? 1.6 }}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => dragging && fromPointer(e.clientX)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      <img src={`${after.src}.webp`} srcSet={`${after.src}-sm.webp 800w, ${after.src}.webp 1600w`} sizes="(min-width: 1024px) 70vw, 100vw" alt={after.alt} loading="lazy" draggable={false} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={`${before.src}.webp`} srcSet={`${before.src}-sm.webp 800w, ${before.src}.webp 1600w`} sizes="(min-width: 1024px) 70vw, 100vw" alt={before.alt} loading="lazy" draggable={false} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <span className="pointer-events-none absolute top-4 left-4 rounded-full bg-charcoal/75 px-3 py-1 text-[0.65rem] tracking-[0.18em] text-ivory uppercase">Before</span>
      <span className="pointer-events-none absolute top-4 right-4 rounded-full bg-ivory/90 px-3 py-1 text-[0.65rem] tracking-[0.18em] text-charcoal uppercase">After</span>
      <div className="pointer-events-none absolute inset-y-0 w-px bg-ivory shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" style={{ left: `${pos}%` }} />
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${label}: drag to compare before and after`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% before visible`}
        onKeyDown={onKey}
        className="absolute top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ivory text-charcoal shadow-xl"
        style={{ left: `${pos}%` }}
      >
        <ChevronsLeftRight aria-hidden className="size-5" />
      </div>
    </div>
  )
}
