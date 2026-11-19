import { Environment } from '@react-three/drei'
import { Suspense } from 'react'
import type { ModelConfig } from './models'
import { LIGHTING, type LightingPreset } from './villa'
import { VillaModel, type HotspotPositions } from './VillaModel'

export function VillaStage({
  model,
  preset = 'daylight',
  section,
  shadows = true,
  onHotspots,
}: {
  model: ModelConfig
  preset?: LightingPreset
  section?: boolean
  shadows?: boolean
  onHotspots?: (p: HotspotPositions) => void
}) {
  const L = LIGHTING[preset]
  return (
    <>
      <ambientLight intensity={L.ambient} />
      <directionalLight
        position={L.sun.position}
        color={L.sun.color}
        intensity={L.sun.intensity}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />
      {L.interiorLights &&
        model.interiorLights.map((p, i) => <pointLight key={i} position={p} color="#ffcf98" intensity={9} distance={9} decay={2} />)}
      <Suspense fallback={null}>
        <Environment files={L.env} environmentIntensity={L.envIntensity} />
      </Suspense>
      <VillaModel model={model} section={section} glow={L.glow} shadows={shadows} onHotspots={onHotspots} />
    </>
  )
}
