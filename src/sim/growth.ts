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

// Count how many distinct face-axis directions have a filled neighbor.
// Corner = 3 axes filled, Edge = 2, Face = 1, Interior = impossible (already filled).
// This is the right anisotropy driver for hopper crystal growth.
function axisConnectivity(
  i: number, j: number, k: number,
  filled: Map<number, number>
): number {
  const xFilled = filled.has(key(i + 1, j, k)) || filled.has(key(i - 1, j, k))
  const yFilled = filled.has(key(i, j + 1, k)) || filled.has(key(i, j - 1, k))
  const zFilled = filled.has(key(i, j, k + 1)) || filled.has(key(i, j, k - 1))
  return (xFilled ? 1 : 0) + (yFilled ? 1 : 0) + (zFilled ? 1 : 0)
}

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
          if (inBounds(ni, nj, nk, half)) {
            filled.set(key(ni, nj, nk), 0)
          }
        }
      }
    }
  }

  return { filled, step: 0, gridSize: params.gridSize }
}

// Face-direction deltas only (no diagonals in scoring)
const FACE6: [number,number,number][] = [
  [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],
]

export function tick(state: LatticeState, params: SimParams): LatticeState {
  const { filled, step, gridSize } = state
  const half = Math.floor(gridSize / 2)
  const nextFilled = new Map(filled)

  // Collect all empty face-adjacent candidates once
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
    const axes = axisConnectivity(ni, nj, nkk, filled)

    // Growth probability by connectivity type:
    // corner (axes=3): very high
    // edge   (axes=2): medium
    // face   (axes=1): very low → creates hollow hopper effect
    let baseP: number
    if (axes === 3) {
      baseP = params.supersaturation * Math.pow(params.anisotropy / 12, 0.3)
    } else if (axes === 2) {
      baseP = params.supersaturation * 0.35
    } else {
      baseP = params.supersaturation * (1 / params.anisotropy) * 0.15
    }

    const thermalNoise = (Math.random() - 0.5) * params.temperature
    const p = Math.min(1, Math.max(0, baseP * coolingFactor + thermalNoise))

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
