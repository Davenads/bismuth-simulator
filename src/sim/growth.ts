import { SimParams } from './params'
import { key, fromKey } from './lattice'

export interface LatticeState {
  filled: Map<number, number>
  step: number
  gridSize: number
}

function inBounds(i: number, j: number, k: number, half: number): boolean {
  return Math.abs(i) <= half && Math.abs(j) <= half && Math.abs(k) <= half
}

const FACE6: [number, number, number][] = [
  [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],
]

export function createInitialState(params: SimParams): LatticeState {
  const filled = new Map<number, number>()
  const half = Math.floor(params.gridSize / 2)

  for (let s = 0; s < params.seedCount; s++) {
    const angle = (s / params.seedCount) * Math.PI * 2
    const spread = params.seedCount > 1 ? Math.floor(params.gridSize / 5) : 0
    const si = Math.round(Math.cos(angle) * spread)
    const sj = Math.round(Math.sin(angle) * spread)
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        for (let dk = -1; dk <= 1; dk++) {
          const ni = si+di, nj = sj+dj, nk = dk
          if (inBounds(ni, nj, nk, half)) filled.set(key(ni, nj, nk), 0)
        }
      }
    }
  }
  return { filled, step: 0, gridSize: params.gridSize }
}

export function tick(state: LatticeState, params: SimParams): LatticeState {
  const { filled, step, gridSize } = state
  const half = Math.floor(gridSize / 2)
  const nextFilled = new Map(filled)

  // Crystal centroid — anchor for the hopper geometry test
  let cx = 0, cy = 0, cz = 0
  for (const [k] of filled) {
    const [i, j, kk] = fromKey(k)
    cx += i; cy += j; cz += kk
  }
  const n = filled.size || 1
  cx /= n; cy /= n; cz /= n

  // hollowThreshold: the ratio b/a below which a site is permanently excluded.
  // b/a = 1.0  → corner or edge direction (always grows)
  // b/a = 0.0  → pure face-center direction (always hollow)
  //
  // Higher anisotropy = higher threshold = more of the face is hollow.
  // Mapping: aniso 1 → threshold 0 (solid), aniso 12 → threshold 0.88 (very hollow).
  const hollowThreshold = Math.min(0.88, (params.anisotropy - 1) / 11 * 0.97)

  // Collect face-adjacent empty candidates
  const candidates = new Set<number>()
  for (const [k] of filled) {
    const [i, j, kk] = fromKey(k)
    for (const [di, dj, dk] of FACE6) {
      const ni = i+di, nj = j+dj, nk2 = kk+dk
      if (inBounds(ni, nj, nk2, half)) {
        const nk = key(ni, nj, nk2)
        if (!filled.has(nk)) candidates.add(nk)
      }
    }
  }

  const coolingFactor = Math.max(0.05, 1 - params.coolingRate * (step / params.maxSteps))

  for (const nk of candidates) {
    const [ni, nj, nkk] = fromKey(nk)

    const ai = Math.abs(ni - cx)
    const aj = Math.abs(nj - cy)
    const ak = Math.abs(nkk - cz)

    // Sort absolute coords descending: a ≥ b ≥ c
    let a = ai, b = aj, c = ak
    if (a < b) { const t = a; a = b; b = t }
    if (a < c) { const t = a; a = c; c = t }
    if (b < c) { const t = b; b = c; c = t }

    // b/a captures surface type:
    //   1.0 = corner [1,1,1] or edge [1,1,0] direction from centroid → grows
    //   0.0 = face-center [1,0,0] direction → hollow
    const ratio = a > 0.5 ? b / a : 1.0

    // Add slight fuzz at the boundary so the hollow edge looks natural, not aliased.
    const fuzz = (Math.random() - 0.5) * params.temperature * 0.15
    if (ratio + fuzz < hollowThreshold) continue  // permanently in hollow zone

    // All non-hollow surface sites grow probabilistically
    const noise = (Math.random() - 0.5) * params.temperature
    const p = Math.min(1, Math.max(0, params.supersaturation * coolingFactor + noise))
    if (Math.random() < p) nextFilled.set(nk, step + 1)
  }

  // Random defect nucleation
  if (params.defectRate > 0) {
    for (let a = 0; a < 5; a++) {
      if (Math.random() < params.defectRate) {
        const ri = Math.round((Math.random() - 0.5) * gridSize)
        const rj = Math.round((Math.random() - 0.5) * gridSize)
        const rk = Math.round((Math.random() - 0.5) * gridSize)
        if (inBounds(ri, rj, rk, half)) nextFilled.set(key(ri, rj, rk), step + 1)
      }
    }
  }

  return { filled: nextFilled, step: step + 1, gridSize }
}
