import { SimParams } from './params'
import { key, fromKey } from './lattice'

export interface LatticeState {
  filled: Map<number, number>
  step: number
  gridSize: number
  // Fixed seed centers — used as reference for pyramid/hollow gates.
  // Storing these prevents gate drift as asymmetric growth shifts the centroid.
  centers: [number, number][]
}

function inBounds(i: number, j: number, k: number, half: number): boolean {
  return Math.abs(i) <= half && Math.abs(j) <= half && Math.abs(k) <= half
}

const FACE6: [number, number, number][] = [
  [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],
]

function baseRadius(params: SimParams): number {
  return Math.floor(params.gridSize * 0.30)
}

function slopePerLayer(params: SimParams): number {
  return Math.max(0.4, params.anisotropy * 0.08)
}

function hollowFraction(params: SimParams): number {
  return Math.min(0.82, 0.44 + (params.anisotropy - 1) / 11 * 0.42)
}

export function createInitialState(params: SimParams): LatticeState {
  const filled = new Map<number, number>()
  const half = Math.floor(params.gridSize / 2)
  const centers: [number, number][] = []

  for (let s = 0; s < params.seedCount; s++) {
    const angle = (s / params.seedCount) * Math.PI * 2
    const spread = params.seedCount > 1 ? Math.floor(params.gridSize / 5) : 0
    const si = Math.round(Math.cos(angle) * spread)
    const sj = Math.round(Math.sin(angle) * spread)
    centers.push([si, sj])

    // Seed: outer ring at k=0 — the pyramid's base perimeter.
    const R = baseRadius(params)
    for (let di = -R; di <= R; di++) {
      for (let dj = -R; dj <= R; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== R) continue
        const ni = si + di, nj = sj + dj, nk = 0
        if (inBounds(ni, nj, nk, half)) filled.set(key(ni, nj, nk), 0)
      }
    }
  }
  return { filled, step: 0, gridSize: params.gridSize, centers }
}

export function tick(state: LatticeState, params: SimParams): LatticeState {
  const { filled, step, gridSize, centers } = state
  const half = Math.floor(gridSize / 2)
  const nextFilled = new Map(filled)

  // Track max height for new-top-layer detection
  let maxK = -Infinity, baseK = Infinity
  for (const [k] of filled) {
    const [,, kk] = fromKey(k)
    if (kk > maxK) maxK = kk
    if (kk < baseK) baseK = kk
  }
  if (baseK === Infinity) baseK = 0

  const slope = slopePerLayer(params)
  const hollow = hollowFraction(params)
  const R = baseRadius(params)
  const coolingFactor = Math.max(0.05, 1 - params.coolingRate * (step / params.maxSteps))

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

  for (const nk of candidates) {
    const [ni, nj, nkk] = fromKey(nk)
    const heightAboveBase = nkk - baseK
    const isAboveTop = nkk > maxK

    // Check against each seed center — candidate is valid if it fits any seed's pyramid.
    let gatePass = false
    for (const [cx, cy] of centers) {
      const lat = Math.max(Math.abs(ni - cx), Math.abs(nj - cy))
      const outer = R - heightAboveBase * slope
      if (outer < 0.5 || lat > outer) continue
      // Hollow gate: interior of each ring stays empty.
      if (outer > 1 && lat < hollow * outer) continue
      gatePass = true
      break
    }
    if (!gatePass) continue

    // BCF step-flow kinetics
    const below = filled.has(key(ni, nj, nkk - 1))
    const inPlane = (
      (filled.has(key(ni+1, nj, nkk)) ? 1 : 0) +
      (filled.has(key(ni-1, nj, nkk)) ? 1 : 0) +
      (filled.has(key(ni, nj+1, nkk)) ? 1 : 0) +
      (filled.has(key(ni, nj-1, nkk)) ? 1 : 0)
    )
    const emptyInPlane = 4 - inPlane

    let p = 0

    if (below && emptyInPlane > 0) {
      // Step-edge: fast growth. New-layer growth (upward) is biased higher.
      p = isAboveTop
        ? params.supersaturation * coolingFactor
        : params.supersaturation * 0.70 * coolingFactor
    } else if (below && emptyInPlane === 0) {
      p = params.temperature * 0.008
    } else if (!below && inPlane >= 2) {
      p = params.supersaturation * 0.50 * coolingFactor
    }

    const noise = (Math.random() - 0.5) * params.temperature * 0.04
    p = Math.min(1, Math.max(0, p + noise))
    if (Math.random() < p) nextFilled.set(nk, step + 1)
  }

  if (params.defectRate > 0) {
    for (let a = 0; a < 3; a++) {
      if (Math.random() < params.defectRate * 0.04) {
        const ri = Math.round((Math.random() - 0.5) * R * 2)
        const rj = Math.round((Math.random() - 0.5) * R * 2)
        const rk = Math.round(Math.random() * maxK)
        if (inBounds(ri, rj, rk, half)) nextFilled.set(key(ri, rj, rk), step + 1)
      }
    }
  }

  return { filled: nextFilled, step: step + 1, gridSize, centers }
}
