import { ContactShadows, Environment, OrbitControls, RoundedBox, useTexture } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useMemo } from 'react'
import { RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import type { Material } from '../../types/content'
import { LoadingOverlay, ViewerErrorBoundary } from './ViewerStates'

export type PreviewShape = 'sphere' | 'block' | 'room'

const BLANK = '/textures/plaster.jpg' // placeholder map so hooks stay unconditional

function useMaterialTextures(material: Material, repeat: number) {
  const urls = [material.texture ? `/textures/${material.texture}.jpg` : BLANK, material.normal ? `/textures/${material.normal}.jpg` : BLANK]
  const [map, normal] = useTexture(urls) as Texture[]
  const textures = useMemo(() => {
    const configure = (t: Texture, color: boolean) => {
      const c = t.clone()
      c.wrapS = c.wrapT = RepeatWrapping
      c.repeat.set(repeat, repeat)
      c.anisotropy = 8
      if (color) c.colorSpace = SRGBColorSpace
      c.needsUpdate = true
      return c
    }
    return {
      map: material.texture ? configure(map, true) : null,
      normalMap: material.normal ? configure(normal, false) : null,
    }
  }, [map, normal, material.texture, material.normal, repeat])
  // Clones are ours to free; the cached originals stay with useTexture.
  useEffect(
    () => () => {
      textures.map?.dispose()
      textures.normalMap?.dispose()
    },
    [textures],
  )
  return textures
}

function SurfaceMaterial({ material, repeat }: { material: Material; repeat: number }) {
  const { map, normalMap } = useMaterialTextures(material, repeat)
  if (material.transmission) {
    return (
      <meshPhysicalMaterial
        color={material.color}
        roughness={material.roughness}
        metalness={0}
        transmission={material.transmission}
        thickness={0.4}
        ior={1.5}
      />
    )
  }
  return (
    <meshStandardMaterial
      key={material.slug}
      color={material.color}
      map={map}
      normalMap={normalMap}
      roughness={material.roughness}
      metalness={material.metalness}
    />
  )
}

function Subject({ material, shape }: { material: Material; shape: PreviewShape }) {
  const r = material.repeat
  if (shape === 'sphere') {
    return (
      <mesh castShadow position={[0, 1, 0]}>
        <sphereGeometry args={[1, 96, 64]} />
        <SurfaceMaterial material={material} repeat={r * 1.5} />
      </mesh>
    )
  }
  if (shape === 'block') {
    return (
      <RoundedBox args={[1.6, 1.6, 1.6]} radius={0.06} smoothness={4} position={[0, 0.8, 0]} castShadow>
        <SurfaceMaterial material={material} repeat={r * 0.8} />
      </RoundedBox>
    )
  }
  // Room corner: floor and two walls in the selected finish.
  return (
    <group position={[0, 0, 0]} rotation={[0, Math.PI / 4, 0]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0, 0.5]}>
        <planeGeometry args={[3, 3]} />
        <SurfaceMaterial material={material} repeat={r * 1.4} />
      </mesh>
      <mesh receiveShadow position={[0.5, 1.25, -1]}>
        <planeGeometry args={[3, 2.5]} />
        <SurfaceMaterial material={material} repeat={r * 1.4} />
      </mesh>
      <mesh receiveShadow position={[-1, 1.25, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[3, 2.5]} />
        <SurfaceMaterial material={material} repeat={r * 1.4} />
      </mesh>
      <mesh castShadow position={[0.6, 0.35, 0.4]}>
        <boxGeometry args={[0.9, 0.7, 0.9]} />
        <meshStandardMaterial color="#f3f0e9" roughness={0.8} />
      </mesh>
    </group>
  )
}

export default function MaterialPreview({ material, shape, reducedMotion }: { material: Material; shape: PreviewShape; reducedMotion: boolean }) {
  return (
    <div className="relative h-full w-full">
      <ViewerErrorBoundary
        fallback={() => (
          <div role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-charcoal/70">
            The 3D preview could not start on this device. The swatch and description still apply.
          </div>
        )}
      >
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ position: shape === 'room' ? [3.4, 2.6, 3.4] : [2.8, 2.2, 3.4], fov: 35 }}
          aria-label={`3D preview of ${material.name} on a ${shape === 'room' ? 'room corner' : shape}`}
          role="img"
        >
          <Suspense fallback={null}>
            <Environment files="/env/studio.exr" environmentIntensity={1.05} />
            <directionalLight position={[4, 6, 3]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
            <Subject material={material} shape={shape} />
            {shape !== 'room' && <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={8} blur={2.4} far={3} />}
          </Suspense>
          <OrbitControls
            target={[0, shape === 'room' ? 0.9 : 0.9, 0]}
            enableZoom={false}
            enablePan={false}
            autoRotate={!reducedMotion && shape !== 'room'}
            autoRotateSpeed={0.8}
            minPolarAngle={0.3}
            maxPolarAngle={Math.PI / 2.05}
          />
        </Canvas>
      </ViewerErrorBoundary>
      <LoadingOverlay tone="light" />
    </div>
  )
}
