import { useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stars } from '@react-three/drei'
import { CrystalMesh } from './CrystalMesh'
import { useSimStore } from '../store'
import { tick } from '../sim/growth'

export function Scene() {
  const { lattice, params, running, speed, setLattice } = useSimStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!running) return

    intervalRef.current = setInterval(() => {
      const current = useSimStore.getState()
      if (current.lattice.step >= current.params.maxSteps) {
        current.setRunning(false)
        return
      }
      current.setLattice(tick(current.lattice, current.params))
    }, 1000 / speed)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, speed, setLattice])

  return (
    <Canvas
      camera={{ position: [0, 80, 45], fov: 45 }}
      shadows
      gl={{ antialias: true }}
      style={{ width: '100vw', height: '100vh' }}
    >
      <color attach="background" args={['#0a0a0f']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[50, 80, 60]} intensity={1.2} castShadow />
      <pointLight position={[-40, 30, -40]} intensity={0.6} color="#6644ff" />
      <pointLight position={[40, -20, 40]} intensity={0.4} color="#ff9933" />
      <Stars radius={200} depth={50} count={3000} factor={4} fade />
      <Environment preset="studio" />
      <CrystalMesh lattice={lattice} maxSteps={params.maxSteps} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
    </Canvas>
  )
}
