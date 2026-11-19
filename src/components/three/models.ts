import type { Vector3Tuple } from 'three'
import heritageHotspots from '../../data/hotspots.json'
import modernHotspots from '../../data/hotspots-modern.json'
import type { ImageRef } from '../../types/content'
import type { Hotspot } from './villa'

export type ModelId = 'villa' | 'flat' | 'office' | 'mutram'

export interface ModelConfig {
  id: ModelId
  /** Short tab label. */
  label: string
  title: string
  blurb: string
  url: string
  fallback: ImageRef
  /** Overview camera. Blender (x, y, z) maps to three.js (x, z, -y). */
  home: { position: Vector3Tuple; target: Vector3Tuple }
  /** Wider, off-centre view used behind the home page text (defaults to `home`). */
  heroHome?: { position: Vector3Tuple; target: Vector3Tuple }
  minDist: number
  maxDist: number
  targetMin: Vector3Tuple
  targetMax: Vector3Tuple
  /** Exact object names hidden by the section toggle. */
  sectionHide: string[]
  /** Objects whose name starts with this prefix are hidden too. */
  sectionPrefix?: string
  /** True when the model should open with the section toggle on (cutaway models). */
  sectionDefault: boolean
  sectionLabel: { show: string; hide: string }
  interiorLights: Vector3Tuple[]
  hotspots: Hotspot[]
  hint: string
}

const fallback = (src: string, alt: string): ImageRef => ({ src: `/images/renders/${src}`, alt, ratio: 1.6 })

export const MODELS: Record<ModelId, ModelConfig> = {
  villa: {
    id: 'villa',
    label: 'Modern villa',
    title: 'Modern Villa',
    blurb:
      'A two-storey contemporary home with a teak-clad upper floor, a jali screen, a pool and coconut palms. Built and textured by a Python script in Blender and rendered here with Three.js.',
    url: '/models/modern-villa.glb',
    fallback: fallback('modern-villa-dusk', 'Rendering of a modern two-storey villa with a teak-clad first floor and glazed ground floor at dusk'),
    home: { position: [-23, 10, 29], target: [1, 3, 1] },
    heroHome: { position: [-31, 11, 36], target: [-3, 3.5, 0] },
    minDist: 3.5,
    maxDist: 60,
    targetMin: [-20, 0, -14],
    targetMax: [20, 9, 24],
    sectionHide: [],
    sectionPrefix: 'Up_',
    sectionDefault: false,
    sectionLabel: { show: 'Show upper floor and roof', hide: 'Section view: lift the upper floor' },
    interiorLights: [
      [-4.2, 3.2, -0.5],
      [5.2, 3.2, 1.0],
      [-2.7, 6.4, -1.5],
      [5.0, 6.4, -0.8],
    ],
    hotspots: modernHotspots.villa as Hotspot[],
    hint: 'Select a point of interest to fly the camera there. Use the layers button to lift the upper floor and look into every room.',
  },
  flat: {
    id: 'flat',
    label: 'Modern flat',
    title: 'Modern 2BHK Flat',
    blurb:
      'A cutaway 2BHK apartment with an open living and dining area, a galley kitchen, a pooja unit by the entrance and two bedrooms. Orbit above it and zoom into any room.',
    url: '/models/modern-flat.glb',
    fallback: fallback('modern-flat-aerial', 'Cutaway rendering of a modern 2BHK flat with living, dining, kitchen and two bedrooms'),
    home: { position: [14, 11.5, 13.5], target: [6, 0.6, -4] },
    minDist: 3.5,
    maxDist: 40,
    targetMin: [-4, 0, -12],
    targetMax: [17, 5, 4],
    sectionHide: [],
    sectionPrefix: 'Up_',
    sectionDefault: true,
    sectionLabel: { show: 'Hide ceiling', hide: 'Show ceiling' },
    interiorLights: [
      [2.6, 2.7, -2.5],
      [2.7, 2.7, -7.2],
      [9.5, 2.7, -2.0],
      [10.4, 2.7, -7.0],
      [6.5, 2.7, -6.0],
    ],
    hotspots: modernHotspots.flat as Hotspot[],
    hint: 'Select a room to fly the camera there. The ceiling is lifted by default; use the layers button to put it back.',
  },
  office: {
    id: 'office',
    label: 'Modern office',
    title: 'Modern Office',
    blurb:
      'A 20 × 11 m cutaway office with reception, four workstation benches, a glass meeting room, a lounge with an oonjal and a pantry along the window wall.',
    url: '/models/modern-office.glb',
    fallback: fallback('modern-office-aerial', 'Cutaway rendering of a modern open-plan office with reception, workstations, meeting room, lounge and pantry'),
    home: { position: [24, 13, 15.5], target: [9.5, 0.6, -4.5] },
    minDist: 4,
    maxDist: 50,
    targetMin: [-3, 0, -14],
    targetMax: [23, 5, 3],
    sectionHide: [],
    sectionPrefix: 'Up_',
    sectionDefault: true,
    sectionLabel: { show: 'Hide ceiling', hide: 'Show ceiling' },
    interiorLights: [
      [3.3, 3.0, -2.0],
      [12.6, 3.0, -3.8],
      [3.3, 3.0, -8.2],
      [10.0, 3.0, -9.0],
      [16.6, 3.0, -9.0],
    ],
    hotspots: modernHotspots.office as Hotspot[],
    hint: 'Select a zone to fly the camera there. The ceiling is lifted by default; use the layers button to put it back.',
  },
  // The courtyard house belongs to the "Mutram Veedu" project page, which still embeds it.
  mutram: {
    id: 'mutram',
    label: 'Courtyard house',
    title: 'Mutram Veedu',
    blurb: 'A Chettinad-style courtyard house — thinnai, mutram, oonjal and pooja.',
    url: '/models/mutram-veedu.glb',
    fallback: fallback('mutram-exterior-dusk', 'Rendering of Mutram Veedu, a courtyard house with a clay-tile roof, at dusk'),
    home: { position: [-21, 15, 27], target: [0, 2, -0.5] },
    minDist: 5,
    maxDist: 55,
    targetMin: [-14, 0, -12],
    targetMax: [14, 8, 14],
    sectionHide: ['House_Roof', 'House_VerandahRoof'],
    sectionDefault: false,
    sectionLabel: { show: 'Show roof', hide: 'Section view: hide roof' },
    interiorLights: [
      [-5.8, 3.0, -3.0],
      [5.6, 2.4, -2.6],
      [0, 2.2, -8.0],
      [0, 2.8, 4.9],
    ],
    hotspots: heritageHotspots as unknown as Hotspot[],
    hint: 'Select a point of interest to fly the camera there. Use the layers button to lift the roof and look inside.',
  },
}

export const MODEL_ORDER: ModelId[] = ['villa', 'flat', 'office']

export function isModelId(v: string | null): v is ModelId {
  return v === 'villa' || v === 'flat' || v === 'office' || v === 'mutram'
}
