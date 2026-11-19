import type { Vector3Tuple } from 'three'

/** Self-hosted Draco decoder (copied from three/examples/jsm/libs/draco/gltf). */
export const DRACO_URL = '/draco/'

export type LightingPreset = 'daylight' | 'dusk' | 'studio'

export const LIGHTING: Record<
  LightingPreset,
  {
    label: string
    env: string
    envIntensity: number
    sun: { position: Vector3Tuple; color: string; intensity: number }
    ambient: number
    glow: number
    interiorLights: boolean
    background: string
  }
> = {
  daylight: {
    label: 'Daylight',
    env: '/env/city.exr',
    envIntensity: 0.9,
    sun: { position: [-18, 24, 16], color: '#fff2df', intensity: 2.6 },
    ambient: 0.15,
    glow: 0.5,
    interiorLights: false,
    background: 'linear-gradient(180deg,#cfd6d6 0%,#e9e6dd 55%,#d9d4c7 100%)',
  },
  dusk: {
    label: 'Dusk',
    env: '/env/sunset.exr',
    envIntensity: 0.45,
    sun: { position: [26, 5, -6], color: '#ff9f62', intensity: 1.6 },
    ambient: 0.05,
    glow: 6,
    interiorLights: true,
    background: 'linear-gradient(180deg,#1d2230 0%,#4b3c3a 60%,#2a2421 100%)',
  },
  studio: {
    label: 'Studio',
    env: '/env/studio.exr',
    envIntensity: 1.1,
    sun: { position: [12, 30, 18], color: '#ffffff', intensity: 1.4 },
    ambient: 0.25,
    glow: 1,
    interiorLights: false,
    background: 'linear-gradient(180deg,#e8e5de 0%,#f3f0e9 100%)',
  },
}

export interface Hotspot {
  id: string
  title: string
  kind: string
  description: string
  camera: Vector3Tuple
  materials: string[]
}
