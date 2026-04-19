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
    // Flat seed in XY plane (just one layer thick) to seed upward pyramid growth
    for (let di = -2; di <= 2; di++) {
      for (let dj = -2; dj <= 2; dj++) {
        const ni = si + di, nj = sj + dj, nk = 0
        if (inBounds(ni, nj, nk, half)) filled.set(key(ni, nj, nk), 0)
      }
    }
  }
  return { filled, step: 0, gridSize: params.gridSize }
}

export function tick(state: LatticeState, params: SimParams): LatticeState {
  const { filled, step, gridSize } = state
  const half = Math.floor(gridSize / 2)
  const nextFilled = new Map(filled)

  // Crystal statistics: max height, max lateral radius, centroid XY
  let maxK = -Infinity, maxLat = 0
  let cx = 0, cy = 0
  for (const [k] of filled) {
    const [i, j, kk] = fromKey(k)
    if (kk > maxK) maxK = kk
    cx += i; cy += j
    const lat = Math.max(Math.abs(i), Math.abs(j))
    if (lat > maxLat) maxLat = lat
  }
  const n = filled.size || 1
  cx /= n; cy /= n

  // hollowFraction: what fraction of the top face stays hollow (face-centre excluded).
  // Higher anisotropy → larger hollow centre.
  const hollowFraction = Math.min(0.90, (params.anisotropy - 1) / 11 * 0.95)

  // Pyramid slope: how many units of lateral extent are lost per unit of height above maxK.
  // Higher anisotropy → steeper pyramid (less lateral spread per height gained).
  const slopePerLayer = Math.max(0.1, 2.0 / params.anisotropy)

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

  for (const nk of candidates) {
    const [ni, nj, nkk] = fromKey(nk)

    const lat = Math.max(Math.abs(ni - cx), Math.abs(nj - cy))
    const isAboveTop = nkk > maxK

    // ── Pyramid shape gate ──────────────────────────────────────────────────
    // Sites above the current top must stay within a shrinking envelope.
    // Each height unit above maxK costs slopePerLayer units of lateral reach.
    if (isAboveTop) {
      const heightAbove = nkk - maxK
      const allowedLat = maxLat - heightAbove * slopePerLayer
      if (lat > allowedLat) continue  // outside pyramid, never grows
    }

    // ── Hollow top-face gate ────────────────────────────────────────────────
    // Only the TOP FACE (sites in the new layer above maxK) has a hollow centre.
    // Hollow zone: lateral position < hollowFraction * current base radius.
    if (isAboveTop && maxLat > 0) {
      if (lat / maxLat < hollowFraction) continue  // face centre, permanently hollow
    }

    // ── BCF step-flow kinetics ──────────────────────────────────────────────
    // Growth rate depends on local step-edge character:
    //   • below=true + lateral edge → step edge (fast)
    //   • below=true + surrounded    → flat terrace (nucleation only, slow)
    //   • below=false + lateral nbrs → lateral wall fill (medium)
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
      // Step edge — primary growth site
      // Upward new-layer growth is faster than lateral step-flow at existing heights
      p = isAboveTop
        ? params.supersaturation * coolingFactor
        : params.supersaturation * (1 / params.anisotropy) * coolingFactor
    } else if (below && emptyInPlane === 0) {
      // Flat terrace: requires thermal nucleation only
      p = params.temperature * 0.012
    } else if (!below && inPlane >= 1) {
      // Lateral wall fill: sites on the pyramid sides supported laterally
      p = params.supersaturation * (0.8 / params.anisotropy) * coolingFactor
    }

    const noise = (Math.random() - 0.5) * params.temperature * 0.08
    p = Math.min(1, Math.max(0, p + noise))
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
