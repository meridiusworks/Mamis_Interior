let webglSupport: boolean | undefined

/** True when the browser can create a WebGL2 (or WebGL1) context. Cached. */
export function hasWebGL(): boolean {
  if (webglSupport !== undefined) return webglSupport
  try {
    const canvas = document.createElement('canvas')
    webglSupport = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    webglSupport = false
  }
  return webglSupport
}

/**
 * Rough capability tier used to switch off expensive effects (shadows, high DPR,
 * auto-load of the hero model). Errs on the side of "low" for small, low-memory
 * or data-saving devices.
 */
export function performanceTier(): 'high' | 'low' {
  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean; effectiveType?: string }
  }
  if (nav.connection?.saveData) return 'low'
  if (nav.connection?.effectiveType && /(^|-)2g|3g/.test(nav.connection.effectiveType)) return 'low'
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return 'low'
  if ((navigator.hardwareConcurrency ?? 8) < 4) return 'low'
  return 'high'
}
