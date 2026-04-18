import * as THREE from 'three'

// Rhombohedral basis for bismuth R-3m, scaled for rendering
const ALPHA = 57.35 * (Math.PI / 180)
const ca = Math.cos(ALPHA)
const tx = Math.sqrt((1 - ca) / 2)
const ty = Math.sqrt((1 - ca) / 6)
const tz = Math.sqrt((1 + 2 * ca) / 3)
const SCALE = 1.5

// Basis rows: transforms rhombo [i,j,k] -> Cartesian [x,y,z]
const B = [
  [tx * 2,  -tx,                    -tx                   ],
  [0,        ty * 2 * Math.sqrt(3),  -ty * 2 * Math.sqrt(3)],
  [tz,       tz,                      tz                   ],
].map(row => row.map(v => v * SCALE))

export function rhomboToCartesian(i: number, j: number, k: number): THREE.Vector3 {
  return new THREE.Vector3(
    B[0][0] * i + B[0][1] * j + B[0][2] * k,
    B[1][0] * i + B[1][1] * j + B[1][2] * k,
    B[2][0] * i + B[2][1] * j + B[2][2] * k,
  )
}

// Offset encoding so negative indices stay positive
const OFF = 500
export function key(i: number, j: number, k: number): number {
  return (i + OFF) * 1_000_000 + (j + OFF) * 1_000 + (k + OFF)
}
export function fromKey(n: number): [number, number, number] {
  const ei = Math.floor(n / 1_000_000)
  const ej = Math.floor((n % 1_000_000) / 1_000)
  const ek = n % 1_000
  return [ei - OFF, ej - OFF, ek - OFF]
}

export const FACE_NEIGHBORS:   [number,number,number][] = [
  [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],
]
export const EDGE_NEIGHBORS:   [number,number,number][] = [
  [1,1,0],[1,-1,0],[-1,1,0],[-1,-1,0],
  [1,0,1],[1,0,-1],[-1,0,1],[-1,0,-1],
  [0,1,1],[0,1,-1],[0,-1,1],[0,-1,-1],
]
export const CORNER_NEIGHBORS: [number,number,number][] = [
  [1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],
  [-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],
]
