import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Expand,
  Layers,
  Minimize,
  RotateCcw,
  RotateCw,
  Scan,
  Sun,
  SunDim,
  Lamp,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { Vector3, type Camera, type Vector3Tuple } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'
import { performanceTier } from '../../utils/device'
import { cn } from '../../utils/format'
import type { ModelConfig } from './models'
import { LIGHTING, type Hotspot, type LightingPreset } from './villa'
import type { HotspotPositions } from './VillaModel'
import { VillaStage } from './VillaStage'
import { LoadingOverlay, ViewerErrorBoundary, ViewerFallback } from './ViewerStates'

interface CameraApi {
  flyTo: (position: Vector3Tuple, target: Vector3Tuple) => void
  orbit: (degrees: number) => void
  zoom: (factor: number) => void
}

/** Smoothly moves camera + orbit target toward a goal; user input cancels it. */
function CameraRig({ api, instant, model }: { api: Ref<CameraApi>; instant: boolean; model: ModelConfig }) {
  const { camera, controls } = useThree() as unknown as { camera: Camera; controls: OrbitControlsImpl | null }
  const goal = useRef<{ pos: Vector3; target: Vector3 } | null>(null)
  const bounds = useMemo(() => ({ min: new Vector3(...model.targetMin), max: new Vector3(...model.targetMax) }), [model])

  useEffect(() => {
    if (!controls) return
    const cancel = () => (goal.current = null)
    const clamp = () => controls.target.clamp(bounds.min, bounds.max)
    controls.addEventListener('start', cancel)
    controls.addEventListener('change', clamp)
    return () => {
      controls.removeEventListener('start', cancel)
      controls.removeEventListener('change', clamp)
    }
  }, [controls, bounds])

  useImperativeHandle(api, () => ({
    flyTo(position, target) {
      goal.current = { pos: new Vector3(...position), target: new Vector3(...target) }
    },
    orbit(deg) {
      if (!controls) return
      const t = goal.current?.target ?? controls.target.clone()
      const offset = (goal.current?.pos ?? camera.position).clone().sub(t)
      offset.applyAxisAngle(new Vector3(0, 1, 0), (deg * Math.PI) / 180)
      goal.current = { pos: t.clone().add(offset), target: t }
    },
    zoom(factor) {
      if (!controls) return
      const t = goal.current?.target ?? controls.target.clone()
      const offset = (goal.current?.pos ?? camera.position).clone().sub(t)
      offset.setLength(Math.min(model.maxDist, Math.max(model.minDist, offset.length() * factor)))
      goal.current = { pos: t.clone().add(offset), target: t }
    },
  }))

  useFrame((_, dt) => {
    const g = goal.current
    if (!g || !controls) return
    const k = instant ? 1 : 1 - Math.exp(-dt * 3.5)
    camera.position.lerp(g.pos, k)
    controls.target.lerp(g.target, k)
    controls.update()
    if (camera.position.distanceTo(g.pos) < 0.01 && controls.target.distanceTo(g.target) < 0.01) goal.current = null
  })
  return null
}

function HotspotMarkers({
  hotspots,
  positions,
  active,
  onSelect,
}: {
  hotspots: Hotspot[]
  positions: HotspotPositions
  active: string | null
  onSelect: (id: string) => void
}) {
  return (
    <>
      {hotspots.map((h, i) => {
        const p = positions[h.id]
        if (!p) return null
        const selected = active === h.id
        return (
          <Html key={h.id} position={p} center zIndexRange={[20, 0]} occlude={false}>
            <button
              type="button"
              onClick={() => onSelect(h.id)}
              aria-label={`${h.title} — ${h.kind}`}
              aria-pressed={selected}
              className={cn(
                'group flex items-center gap-2 rounded-full border text-[0.68rem] font-medium tracking-[0.1em] whitespace-nowrap uppercase shadow-lg transition-all duration-300',
                selected
                  ? 'border-ivory bg-ivory py-1.5 pr-3 pl-1.5 text-charcoal'
                  : 'border-ivory/70 bg-charcoal/70 p-1.5 text-ivory backdrop-blur hover:bg-charcoal',
              )}
            >
              <span className={cn('grid size-5 place-items-center rounded-full text-[0.6rem] tabular-nums', selected ? 'bg-charcoal text-ivory' : 'bg-ivory text-charcoal')}>
                {i + 1}
              </span>
              <span className={cn(selected ? 'inline' : 'hidden group-hover:inline group-focus-visible:inline')}>{h.title}</span>
            </button>
          </Html>
        )
      })}
    </>
  )
}

interface VillaExplorerProps {
  model: ModelConfig
  active: string | null
  onActiveChange: (id: string | null) => void
  preset: LightingPreset
  onPresetChange: (p: LightingPreset) => void
  section: boolean
  onSectionChange: (v: boolean) => void
  className?: string
  /** Compact variant used inside project pages. */
  compact?: boolean
}

/**
 * Interactive Blender model: orbit / zoom / pan with limits, hotspots, lighting
 * presets, section view, fullscreen, and DOM controls that mirror every
 * gesture so the canvas is never the only way in.
 */
export function VillaExplorer({
  model,
  active,
  onActiveChange,
  preset,
  onPresetChange,
  section,
  onSectionChange,
  className,
  compact,
}: VillaExplorerProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const api = useRef<CameraApi>(null)
  const reduced = usePrefersReducedMotion()
  const [lowPower] = useState(() => performanceTier() === 'low')
  const [positions, setPositions] = useState<HotspotPositions>({})
  const [fullscreen, setFullscreen] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrap.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Fly to the selected hotspot (or home when cleared).
  useEffect(() => {
    const h = model.hotspots.find((x) => x.id === active)
    const target = h && positions[h.id]
    if (h && target) api.current?.flyTo(h.camera, target.toArray() as Vector3Tuple)
    else if (!active) api.current?.flyTo(model.home.position, model.home.target)
  }, [active, positions, model])

  const onHotspots = useCallback((p: HotspotPositions) => setPositions(p), [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await wrap.current?.requestFullscreen()
    } catch {
      /* Fullscreen can be refused (iframes, iOS); the viewer keeps working. */
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    const actions: Record<string, () => void> = {
      ArrowLeft: () => api.current?.orbit(-15),
      ArrowRight: () => api.current?.orbit(15),
      '+': () => api.current?.zoom(0.8),
      '=': () => api.current?.zoom(0.8),
      '-': () => api.current?.zoom(1.25),
      r: () => onActiveChange(null),
    }
    const fn = actions[e.key]
    if (fn) {
      e.preventDefault()
      fn()
    }
  }

  const supportsFullscreen = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen

  return (
    <div
      ref={wrap}
      className={cn('overflow-hidden bg-charcoal', className ?? 'relative h-full w-full')}
      style={{ background: LIGHTING[preset].background }}
      onKeyDown={onKeyDown}
    >
      <ViewerErrorBoundary
        key={attempt}
        onReset={() => {
          useGLTF.clear(model.url)
          setAttempt((a) => a + 1)
        }}
        fallback={(_, reset) => (
          <ViewerFallback reason="The 3D model could not be loaded. Showing a rendering instead." onRetry={reset} />
        )}
      >
        <Canvas
          shadows={!lowPower}
          dpr={lowPower ? 1 : [1, 1.75]}
          camera={{ position: model.home.position, fov: 35, near: 0.3, far: 400 }}
          gl={{ antialias: true, alpha: true }}
          aria-label={`Interactive 3D model of ${model.title}. Drag to orbit, scroll or pinch to zoom, right-drag or two-finger drag to pan. Keyboard: focus the viewer, then use the arrow keys to rotate and plus or minus to zoom.`}
          role="application"
          tabIndex={0}
          className="touch-none outline-none"
        >
          <Suspense fallback={null}>
            <VillaStage model={model} preset={preset} section={section} shadows={!lowPower} onHotspots={onHotspots} />
            <HotspotMarkers hotspots={model.hotspots} positions={positions} active={active} onSelect={(id) => onActiveChange(id === active ? null : id)} />
          </Suspense>
          <OrbitControls
            makeDefault
            target={model.home.target}
            enableDamping
            dampingFactor={0.08}
            minDistance={model.minDist}
            maxDistance={model.maxDist}
            maxPolarAngle={Math.PI * 0.49}
            screenSpacePanning
          />
          <CameraRig api={api} instant={reduced} model={model} />
        </Canvas>
      </ViewerErrorBoundary>
      <LoadingOverlay tone={preset === 'dusk' ? 'dark' : 'light'} />

      {/* Controls outside the canvas — every action is reachable by keyboard. */}
      <div
        role="toolbar"
        aria-label="3D viewer controls"
        className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-center gap-1.5 p-3 sm:p-4"
      >
        <div className="flex items-center gap-1 rounded-full bg-charcoal/80 p-1 text-ivory backdrop-blur">
          <ToolButton label="Rotate left" onClick={() => api.current?.orbit(-20)}>
            <RotateCcw className="size-4" />
          </ToolButton>
          <ToolButton label="Rotate right" onClick={() => api.current?.orbit(20)}>
            <RotateCw className="size-4" />
          </ToolButton>
          <ToolButton label="Zoom in" onClick={() => api.current?.zoom(0.75)}>
            <ZoomIn className="size-4" />
          </ToolButton>
          <ToolButton label="Zoom out" onClick={() => api.current?.zoom(1.3)}>
            <ZoomOut className="size-4" />
          </ToolButton>
          <ToolButton label="Reset view" onClick={() => onActiveChange(null)}>
            <Scan className="size-4" />
          </ToolButton>
          <ToolButton label={section ? model.sectionLabel.show : model.sectionLabel.hide} pressed={section} onClick={() => onSectionChange(!section)}>
            <Layers className="size-4" />
          </ToolButton>
          {supportsFullscreen && (
            <ToolButton label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
              {fullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}
            </ToolButton>
          )}
        </div>
        {!compact && (
          <div role="radiogroup" aria-label="Lighting" className="flex items-center gap-1 rounded-full bg-charcoal/80 p-1 text-ivory backdrop-blur">
            {(Object.keys(LIGHTING) as LightingPreset[]).map((p) => {
              const Icon = p === 'daylight' ? Sun : p === 'dusk' ? SunDim : Lamp
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={preset === p}
                  onClick={() => onPresetChange(p)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.68rem] tracking-[0.12em] uppercase transition-colors',
                    preset === p ? 'bg-ivory text-charcoal' : 'hover:bg-ivory/15',
                  )}
                >
                  <Icon aria-hidden className="size-3.5" />
                  {LIGHTING[p].label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ToolButton({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn('grid size-9 place-items-center rounded-full transition-colors', pressed ? 'bg-ivory text-charcoal' : 'hover:bg-ivory/15')}
    >
      <span aria-hidden>{children}</span>
    </button>
  )
}
