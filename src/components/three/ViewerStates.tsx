import { useProgress } from '@react-three/drei'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { dialogue } from '../ui/Dialogue'
import { Picture } from '../ui/Picture'
import type { ImageRef } from '../../types/content'

export const VILLA_FALLBACK: ImageRef = {
  src: '/images/renders/modern-villa-dusk',
  alt: 'Rendering of a modern two-storey villa with a teak-clad first floor at dusk — shown when the interactive model is unavailable',
  ratio: 1.6,
}

/** DOM overlay showing download progress of the 3D assets. */
export function LoadingOverlay({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { active, progress } = useProgress()
  if (!active && progress >= 100) return null
  const dark = tone === 'dark'
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center ${dark ? 'text-ivory' : 'text-charcoal'}`}
    >
      <div className="w-56 text-center">
        <p className="eyebrow mb-1">Loading 3D model</p>
        <p lang="ta-Latn" className="mb-3 font-serif text-[1.05rem] italic opacity-80">{dialogue('loading3d').ta}</p>
        <div className={`h-px w-full ${dark ? 'bg-ivory/20' : 'bg-charcoal/15'}`}>
          <div className={`h-px ${dark ? 'bg-ivory' : 'bg-charcoal'} transition-[width] duration-300`} style={{ width: `${Math.round(progress)}%` }} />
        </div>
        <p className="mt-2 text-xs tabular-nums opacity-70">{Math.round(progress)}%</p>
      </div>
    </div>
  )
}

export function ViewerFallback({ reason, onRetry, image = VILLA_FALLBACK }: { reason: string; onRetry?: () => void; image?: ImageRef }) {
  return (
    <div className="absolute inset-0">
      <Picture image={image} fill sizes="100vw" />
      <div className="absolute inset-0 bg-charcoal/55" />
      <div role="alert" className="on-dark absolute inset-x-0 bottom-0 flex flex-col items-start gap-4 p-6 text-ivory sm:p-10">
        <p className="flex items-center gap-2 text-sm">
          <AlertTriangle aria-hidden className="size-4" />
          {reason}
        </p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-full border border-ivory/40 px-4 py-2 text-xs tracking-[0.14em] uppercase hover:bg-ivory hover:text-charcoal">
            <RotateCcw aria-hidden className="size-3.5" /> Try again
          </button>
        )}
      </div>
    </div>
  )
}

interface BoundaryProps {
  fallback: (error: Error, reset: () => void) => ReactNode
  children: ReactNode
  onReset?: () => void
}

/** Catches model loading / WebGL errors so the rest of the page keeps working. */
export class ViewerErrorBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('3D viewer error', error, info.componentStack)
  }

  reset = () => {
    this.props.onReset?.()
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) return this.props.fallback(this.state.error, this.reset)
    return this.props.children
  }
}
