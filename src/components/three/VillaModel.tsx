import { useGLTF } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo } from 'react'
import { Mesh, MeshStandardMaterial, Vector3, type Material } from 'three'
import type { ModelConfig } from './models'
import { DRACO_URL } from './villa'

export type HotspotPositions = Record<string, Vector3>

interface VillaModelProps {
  model: ModelConfig
  /** Hide the roof / upper floor / ceiling to look inside. */
  section?: boolean
  /** Emissive strength for lamp materials (raised at dusk). */
  glow?: number
  shadows?: boolean
  onHotspots?: (positions: HotspotPositions) => void
}

const isLamp = (m: Material) => m.name === 'AN_lamp_glow' || m.name === 'AN_lamp_shade' || m.name === 'AN_flame'

/**
 * The Blender-generated courtyard house. The cached glTF scene is cloned so several
 * canvases can mount it; geometry, textures and materials stay shared.
 */
export function VillaModel({ model, section = false, glow = 1, shadows = true, onHotspots }: VillaModelProps) {
  const { scene } = useGLTF(model.url, DRACO_URL)

  const { root, lamps } = useMemo(() => {
    const root = scene.clone(true)
    const lamps = new Set<MeshStandardMaterial>()
    root.traverse((obj) => {
      if (!(obj instanceof Mesh)) return
      const materials = (Array.isArray(obj.material) ? obj.material : [obj.material]) as MeshStandardMaterial[]
      const transparent = materials.some((m) => m.transparent)
      obj.castShadow = shadows && !transparent
      obj.receiveShadow = shadows
      for (const m of materials) {
        if (m.transparent) {
          m.depthWrite = false
          m.envMapIntensity = 1.6
        }
        if (isLamp(m)) lamps.add(m)
        for (const tex of [m.map, m.normalMap]) if (tex) tex.anisotropy = 8
      }
    })
    return { root, lamps }
  }, [scene, shadows])

  useEffect(() => {
    for (const name of model.sectionHide) {
      const obj = root.getObjectByName(name)
      if (obj) obj.visible = !section
    }
    const prefix = model.sectionPrefix
    if (prefix) {
      root.traverse((obj) => {
        if (obj.name.startsWith(prefix)) obj.visible = !section
      })
    }
  }, [root, section, model])

  useEffect(() => {
    lamps.forEach((m) => {
      m.emissiveIntensity = m.name === 'AN_lamp_shade' ? glow * 0.4 : glow * 1.5
    })
  }, [lamps, glow])

  useLayoutEffect(() => {
    if (!onHotspots) return
    root.updateMatrixWorld(true)
    const positions: HotspotPositions = {}
    root.traverse((obj) => {
      if (obj.name.startsWith('Hotspot_')) positions[obj.name] = obj.getWorldPosition(new Vector3())
    })
    onHotspots(positions)
  }, [root, onHotspots])

  return <primitive object={root} />
}

