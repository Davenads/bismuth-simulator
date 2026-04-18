import { SimParams } from './params'
import { key, fromKey } from './lattice'

export interface LatticeState {
  filled: Map<number, number>  // encoded key -> step filled
  step: number
  gridSize: number
}

function inBounds(i: number, j: number, k: number, half: number): boolean {
  return Math.abs(i) <= half && Math.abs(j) <= half && Math.abs(k) <= half
}

// The 8 [111]-family directions (normalised) — bismuth's fast-growth corners
const INV_SQRT3 = 1 / Math.sqrt(3)
const CORNER_DIRS: [number, number, number][] = [
  [ 1, 1, 1], [-1, 1, 1], [ 1,-1, 1], [ 1, 1,-1],
  [-1,-1, 1], [-1, 1,-1], [ 1,-1,-1], [-1,-1,-1],
].map(([x,y,z]) => [x * INV_SQRT3, y * INV_SQRT3, z * INV_SQRT3] as [number,number,number])

// How closely does direction (di,dj,dk) from crystal center point toward any [111] corner?
// Returns 1.0 at a perfect corner, ~0.577 at a face-center direction.
function cornerAlignment(di: number, dj: number, dk: number): number {
  const len = Math.sqrt(di * di + dj * dj + dk * dk)
  if (len < 1e-6) return 0
  const nx = di / len, ny = dj / len, nz = dk / len
  let best = 0
  for (const [cx, cy, cz] of CORNER_DIRS) {
    const dot = nx * cx + ny * cy + nz * cz
    if (dot > best) best = dot
  }
  return best
}

// Face-direction offsets only — candidates must be directly adjacent to crystal
const FACE6: [number,number,number][] = [
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
          const ni = si + di, nj = sj + dj, nk = dk
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

  // Compute crystal centroid — used to score outward direction of each candidate
  let cx = 0, cy = 0, cz = 0
  for (const [k] of filled) {
    const [i, j, kk] = fromKey(k)
    cx += i; cy += j; cz += kk
  }
  const n = filled.size || 1
  cx /= n; cy /= n; cz /= n

  // Collect face-adjacent empty candidates
  const candidates = new Set<number>()
  for (const [k] of filled) {
    const [i, j, kk] = fromKey(k)
    for (const [di, dj, dk] of FACE6) {
      const ni = i + di, nj = j + dj, nk2 = kk + dk
      if (inBounds(ni, nj, nk2, half)) {
        const nk = key(ni, nj, nk2)
        if (!filled.has(nk)) candidates.add(nk)
      }
    }
  }

  const coolingFactor = Math.max(0.05, 1 - params.coolingRate * (step / params.maxSteps))

  for (const nk of candidates) {
    const [ni, nj, nkk] = fromKey(nk)

    // Direction from crystal center to this candidate
    const alignment = cornerAlignment(ni - cx, nj - cy, nkk - cz)

    // alignment ≈ 1.0 at crystal corners → very high P
    // alignment ≈ 0.577 at face centers → very low P (especially with high anisotropy)
    // anisotropy controls how sharply the corner preference falls off
    const dirScore = Math.pow(alignment, params.anisotropy)

    const thermalNoise = (Math.random() - 0.5) * params.temperature
    const p = Math.min(1, Math.max(0,
      params.supersaturation * dirScore * coolingFactor + thermalNoise
    ))

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
