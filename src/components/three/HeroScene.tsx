import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { MathUtils } from 'three'
import { useFinePointer } from '../../hooks/useMediaQuery'
import { MODELS } from './models'
import { VillaStage } from './VillaStage'
import { LoadingOverlay, ViewerErrorBoundary } from './ViewerStates'

/** Gentle pointer parallax on top of the slow auto-rotation. */
function PointerDrift({ enabled }: { enabled: boolean }) {
  const { camera, pointer } = useThree()
  const base = useRef(camera.position.y)
  useFrame(() => {
    if (!enabled) return
    camera.position.y = MathUtils.lerp(camera.position.y, base.current + pointer.y * 1.2, 0.03)
  })
  return null
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady])
  return null
}

/**
 * Home hero: the villa at dusk, slowly orbiting. Zoom and touch-drag are off
 * so scrolling the page is never hijacked; mouse users can drag to rotate.
 * The canvas stops rendering when scrolled out of view.
 */
const HERO = MODELS.villa
const HERO_VIEW = HERO.heroHome ?? HERO.home

export default function HeroScene({ reducedMotion, lowPower, onReady }: { reducedMotion: boolean; lowPower: boolean; onReady: () => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)
  const fine = useFinePointer()

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.01 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={wrap} className="absolute inset-0">
      <ViewerErrorBoundary fallback={() => null}>
        <Canvas
          shadows={!lowPower}
          dpr={lowPower ? 1 : [1, 1.75]}
          frameloop={inView ? 'always' : 'never'}
          camera={{ position: HERO_VIEW.position, fov: 32, near: 0.5, far: 400 }}
          gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
          aria-label="Interactive 3D model of a modern two-storey villa at dusk"
          role="img"
        >
          <Suspense fallback={null}>
            <VillaStage model={HERO} preset="dusk" shadows={!lowPower} />
            <Ready onReady={onReady} />
          </Suspense>
          <OrbitControls
            target={HERO_VIEW.target}
            enableZoom={false}
            enablePan={false}
            enableRotate={fine}
            autoRotate={!reducedMotion}
            autoRotateSpeed={-0.35}
            enableDamping
            minPolarAngle={Math.PI * 0.32}
            maxPolarAngle={Math.PI * 0.46}
          />
          <PointerDrift enabled={fine && !reducedMotion} />
        </Canvas>
      </ViewerErrorBoundary>
      <LoadingOverlay />
    </div>
  )
}
