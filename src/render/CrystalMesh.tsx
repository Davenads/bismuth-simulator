import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { rhomboToCartesian, fromKey } from '../sim/lattice'
import { LatticeState } from '../sim/growth'

interface Props {
  lattice: LatticeState
  maxSteps: number
}

const dummy = new THREE.Object3D()
const tmpColor = new THREE.Color()
const VOXEL = 1.72

// [111] unit vector — the pyramid growth axis in bismuth
const AXIS_111 = new THREE.Vector3(1, 1, 1).normalize()

// Iridescence palette mimicking Bi₂O₃ thin-film interference
// Maps t ∈ [0,1] (layer height along [111]) to hue bands:
// silver/white → gold → orange → magenta → violet → blue → teal → back
function irisColor(t: number): THREE.Color {
  const hue = (t * 3.5) % 1          // 3.5 full cycles across growth extent
  const sat = 0.7 + 0.3 * Math.sin(t * Math.PI * 4)
  const lit = 0.44 + 0.18 * Math.cos(t * Math.PI * 2)
  return tmpColor.clone().setHSL(hue, Math.min(1, sat), Math.max(0.3, Math.min(0.72, lit)))
}

export function CrystalMesh({ lattice, maxSteps: _maxSteps }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const entries = useMemo(() => {
    const arr: { pos: THREE.Vector3; step: number }[] = []
    for (const [k, step] of lattice.filled) {
      const [i, j, kk] = fromKey(k)
      arr.push({ pos: rhomboToCartesian(i, j, kk), step })
    }
    return arr
  }, [lattice])

  // Height along [111] axis — used for per-layer iridescence
  const heightBounds = useMemo(() => {
    if (entries.length === 0) return { min: 0, max: 1 }
    let min = Infinity, max = -Infinity
    for (const { pos } of entries) {
      const h = pos.dot(AXIS_111)
      if (h < min) min = h
      if (h > max) max = h
    }
    return { min, max: max === min ? min + 1 : max }
  }, [entries])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || entries.length === 0) return

    const { min, max } = heightBounds
    const range = max - min

    entries.forEach(({ pos }, idx) => {
      dummy.position.copy(pos)
      dummy.updateMatrix()
      mesh.setMatrixAt(idx, dummy.matrix)

      // t = normalised height along [111] → iridescent band color
      const t = (pos.dot(AXIS_111) - min) / range
      mesh.setColorAt(idx, irisColor(t))
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.count = entries.length
  }, [entries, heightBounds])

  if (entries.length === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, entries.length]} castShadow receiveShadow>
      <boxGeometry args={[VOXEL, VOXEL, VOXEL]} />
      <meshStandardMaterial metalness={0.92} roughness={0.07} />
    </instancedMesh>
  )
}
