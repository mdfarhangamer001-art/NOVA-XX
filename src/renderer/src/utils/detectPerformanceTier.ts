/**
 * detectPerformanceTier.ts
 * ---------------------------------------------------------------------
 * The old auto-detect logic only checked "does WebGL exist at all?" —
 * true on almost every laptop, including budget ones with Intel
 * integrated graphics (e.g. HP 250 G7: dual/quad-core i3/i5, Intel UHD
 * 620, 4-8GB RAM). That's why weak machines were defaulting to the
 * heaviest 3D "high" mode and crashing/lagging.
 *
 * This does a slightly smarter, still-cheap check using signals actually
 * available in a Chromium/Electron renderer:
 *  - navigator.hardwareConcurrency (CPU core count)
 *  - navigator.deviceMemory (approximate RAM in GB, Chromium-only)
 *  - the WebGL UNMASKED_RENDERER_WEBGL string, to catch:
 *      - software rasterizers (SwiftShader / llvmpipe / "Microsoft Basic
 *        Render Driver") -> definitely low-end
 *      - Intel integrated graphics -> common on budget laptops, treat as
 *        medium/low depending on core count
 */

export type PerfTier = 'high' | 'medium' | 'low'

function getWebglRendererInfo(): { supported: boolean; renderer: string } {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return { supported: false, renderer: '' }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = debugInfo
      ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string) || ''
      : (gl.getParameter(gl.RENDERER) as string) || ''
    return { supported: true, renderer: renderer.toLowerCase() }
  } catch (e) {
    return { supported: false, renderer: '' }
  }
}

export function detectPerformanceTier(): PerfTier {
  const { supported, renderer } = getWebglRendererInfo()
  if (!supported) return 'low'

  const isSoftwareRenderer =
    /swiftshader|llvmpipe|microsoft basic render|software/i.test(renderer)
  if (isSoftwareRenderer) return 'low'

  const cores = (navigator as any).hardwareConcurrency || 4
  // deviceMemory is a Chromium-only API, capped at 8 by spec (so "8" really
  // means "8 or more"). Not available in all Electron versions, so we
  // treat missing as "unknown" rather than assuming either way.
  const memGB: number | null = (navigator as any).deviceMemory || null

  const isIntegratedIntel = /intel/i.test(renderer) && !/iris xe|arc a/i.test(renderer)

  if (cores <= 2) return 'low'
  if (memGB !== null && memGB <= 4) return 'low'

  if (cores <= 4 && isIntegratedIntel) return 'medium'
  if (memGB !== null && memGB <= 8) return 'medium'
  if (isIntegratedIntel) return 'medium'

  return 'high'
}
