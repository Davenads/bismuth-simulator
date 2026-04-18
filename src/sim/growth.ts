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

// The 8 [111]-family corner directions (normalised)
const INV_SQRT3 = 1 / Math.sqrt(3)
const CORNER_DIRS: [number, number, number][] = [
  [ 1, 1, 1], [-1, 1, 1], [ 1,-1, 1], [ 1, 1,-1],
  [-1,-1, 1], [-1, 1,-1], [ 1,-1,-1], [-1,-1,-1],
].map(([x,y,z]) => [x*INV_SQRT3, y*INV_SQRT3, z*INV_SQRT3] as [number,number,number])

// How well does direction (di,dj,dk) from the crystal centroid point toward a [111] corner?
// Returns: 1.0 at a pure corner direction, ~0.816 at an edge, ~0.577 at a face-center.
function cornerAlignment(di: number, dj: number, dk: number): number {
  const len = Math.sqrt(di*di + dj*dj + dk*dk)
  if (len < 1e-6) return 0
  const nx = di/len, ny = dj/len, nz = dk/len
  let best = 0
  for (const [cx, cy, cz] of CORNER_DIRS) {
    const dot = nx*cx + ny*cy + nz*cz
    if (dot > best) best = dot
  }
  return best
}

// Count distinct axis directions that have at least one filled face-neighbor.
// A corner site of the crystal has 3; an edge site 2; a flat face site 1.
function axisConnectivity(i: number, j: number, k: number, filled: Map<number,number>): number {
  const x = filled.has(key(i+1,j,k)) || filled.has(key(i-1,j,k))
  const y = filled.has(key(i,j+1,k)) || filled.has(key(i,j-1,k))
  const z = filled.has(key(i,j,k+1)) || filled.has(key(i,j,k-1))
  return (x ? 1 : 0) + (y ? 1 : 0) + (z ? 1 : 0)
}

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

  // Crystal centroid — anchor for global direction scoring
  let cx = 0, cy = 0, cz = 0
  for (const [k] of filled) {
    const [i, j, kk] = fromKey(k)
    cx += i; cy += j; cz += kk
  }
  const count = filled.size || 1
  cx /= count; cy /= count; cz /= count

  // Face-adjacent empty candidates
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

  // Exponent is doubled so that the face-center direction (alignment ≈ 0.577) collapses
  // to near-zero probability even at moderate anisotropy values, while corners (≈ 0.94)
  // remain viable. This prevents the cube-filling problem where face sites slowly
  // accumulate over hundreds of steps.
  const exponent = params.anisotropy * 2

  for (const nk of candidates) {
    const [ni, nj, nkk] = fromKey(nk)

    // Global: how corner-ward is this site from the crystal center?
    const alignment = cornerAlignment(ni - cx, nj - cy, nkk - cz)

    // Local: how many crystal-facing axes does this site already border?
    // Acts as a secondary growth driver — once edges form, they pull adjacent sites in.
    const axes = axisConnectivity(ni, nj, nkk, filled)
    const localBonus = axes >= 3 ? 2.0 : axes === 2 ? 1.4 : 1.0

    // Growth probability: corner-alignment is the dominant term.
    // Face-center: alignment ≈ 0.577, 0.577^(7*2) ≈ 0.000001 → effectively zero
    // Corner:      alignment ≈ 0.940, 0.940^(7*2) ≈ 0.180    → active growth
    const dirScore = Math.pow(alignment, exponent)
    const thermalNoise = (Math.random() - 0.5) * params.temperature
    const p = Math.min(1, Math.max(0,
      params.supersaturation * dirScore * localBonus * coolingFactor + thermalNoise
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
