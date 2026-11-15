import type { Heat, Region } from '../../lib/muscles'

// The figure is drawn in a 200 x 440 box, centre line x = 100. Shapes are the
// left half; the components mirror them, so the body is perfectly symmetric.

/** Top and bottom colour of a muscle per heat level (brighter = more work). */
export const HEAT_GRADIENT: Record<Heat, [string, string]> = {
  0: ['#3b4552', '#2a323c'],
  1: ['#b0621d', '#7a430f'],
  2: ['#ff9a2b', '#d26a0e'],
  3: ['#ffd667', '#ff9f1c'],
}
export const SKIN: [string, string] = ['#252c36', '#181d24']
export const GAP = '#12161b'

export const SILHOUETTE =
  'M100,44 L91,46 L91,57 Q84,66 66,69 Q50,71 46,88 Q43,112 41,136 Q39,150 36,162 Q30,186 29,208 Q27,220 26,232 ' +
  'Q26,245 33,246 Q40,245 40,232 L41,210 Q46,186 50,164 Q54,146 57,124 Q58,112 62,106 Q65,128 70,150 Q66,172 64,190 ' +
  'Q60,232 66,272 Q68,288 67,300 Q60,330 67,366 Q70,386 71,398 Q63,412 66,421 L89,421 Q91,410 86,398 ' +
  'Q86,380 88,360 Q92,330 90,304 Q89,290 91,274 Q95,236 100,208 Z'

const DELTOID = 'M66,70 Q51,71 47,88 Q46,98 50,105 Q58,99 63,87 Q66,79 66,70 Z'
const FOREARM = 'M41,157 Q33.5,180 31,207 L40.5,209.5 Q46.5,188 50.5,165 Q46,153 41,157 Z'
const UPPER_ARM = 'M50,106 Q44,121 44,138 Q46,149 51.5,151 Q56.5,143 57.5,125 Q57.5,113 56,104 Q53,107 50,106 Z'

export interface Shape {
  region: Region
  d: string
}

export const FRONT: Shape[] = [
  // Neck-to-shoulder slope of the trapezius.
  { region: 'upperBack', d: 'M91,57 Q85,65 70,69 Q80,70 90,68 Z' },
  { region: 'shoulders', d: DELTOID },
  { region: 'chest', d: 'M68,72 Q84,68 98.5,73 L98.5,103 Q88,114 75,110 Q66,105 64.5,91 Q65,80 68,72 Z' },
  { region: 'biceps', d: UPPER_ARM },
  { region: 'forearms', d: FOREARM },
  // Six-pack: three blocks and the lower abs, per side.
  { region: 'core', d: 'M86,115 Q92,112 98.5,113 V125.5 H85.5 Q85,119 86,115 Z' },
  { region: 'core', d: 'M85.5,128 H98.5 V140.5 H85.5 Z' },
  { region: 'core', d: 'M85.5,143 H98.5 V155.5 H86 Z' },
  { region: 'core', d: 'M86,158 H98.5 V186 Q91,182 88,172 Q86,165 86,158 Z' },
  // Obliques.
  { region: 'core', d: 'M72,113 Q78,119 83,117 L83,150 Q79,162 82,180 Q73,170 70.5,150 Q69,130 72,113 Z' },
  // Quads: outer sweep, and the middle with the teardrop above the knee.
  { region: 'quads', d: 'M66.5,196 Q62,234 68,270 Q72,281 77,276 Q74,240 78,202 Q72,193 66.5,196 Z' },
  { region: 'quads', d: 'M80.5,202 Q77,240 80,278 Q86,287 90,277 Q94,244 97,214 Q90,199 80.5,202 Z' },
  // Shin and the inner calf seen from the front.
  { region: 'calves', d: 'M69,305 Q63.5,330 69,364 Q73,372 76,364 Q79,334 77,305 Q73,299 69,305 Z' },
  { region: 'calves', d: 'M80,307 Q82,334 79.5,360 Q84,367 87,357 Q89.5,332 88,307 Q84,301 80,307 Z' },
]

export const BACK: Shape[] = [
  // Trapezius: a kite from the neck across the shoulders down to mid-back.
  { region: 'upperBack', d: 'M99,48 L92,56 Q84,66 68,70 Q84,78 91,97 L99,127 Z' },
  { region: 'shoulders', d: DELTOID },
  // Around the shoulder blade.
  { region: 'upperBack', d: 'M67.5,74 Q80,80 87.5,98 L85,107 Q74,105 65.5,97 Q63.5,85 67.5,74 Z' },
  { region: 'lats', d: 'M63.5,101 Q65.5,128 70.5,150 Q80,160 96.5,161 L96.5,134 L88.5,111 Q76,109 63.5,101 Z' },
  { region: 'lowerBack', d: 'M79,165 Q89,167 98.5,165 V190 Q86,189 73.5,183 Q75,172 79,165 Z' },
  { region: 'triceps', d: UPPER_ARM },
  { region: 'forearms', d: FOREARM },
  { region: 'glutes', d: 'M66,192 Q80,186 98.5,193 V222 Q85,233 70.5,225 Q63,211 66,192 Z' },
  { region: 'hamstrings', d: 'M66,231 Q64,255 69,277 Q74,283 79,277 Q78,251 80.5,234 Q72,236 66,231 Z' },
  { region: 'hamstrings', d: 'M83.5,236 Q81.5,257 83.5,279 Q88,285 91,275 Q94,253 97,232 Q90,238 83.5,236 Z' },
  // Calves: the two heads of the gastrocnemius.
  { region: 'calves', d: 'M66.5,303 Q61.5,327 67.5,351 Q72,361 76,351 Q78,327 76,303 Q71,297 66.5,303 Z' },
  { region: 'calves', d: 'M79,303 Q78,327 80,351 Q85,359 88,347 Q91,325 89,303 Q84,297 79,303 Z' },
]
