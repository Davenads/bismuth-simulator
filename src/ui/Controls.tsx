import { useControls, button, folder } from 'leva'
import { useSimStore } from '../store'

export function Controls() {
  const { setParams, setRunning, setSpeed, reset } = useSimStore()

  useControls({
    Simulation: folder({
      coolingRate: {
        value: 0.3, min: 0.05, max: 1.0, step: 0.01, label: 'Cooling Rate',
        onChange: (v) => setParams({ coolingRate: v }),
      },
      supersaturation: {
        value: 0.5, min: 0.1, max: 1.0, step: 0.01, label: 'Supersaturation',
        onChange: (v) => setParams({ supersaturation: v }),
      },
      anisotropy: {
        value: 8.0, min: 1.0, max: 12.0, step: 0.1, label: 'Anisotropy',
        onChange: (v) => setParams({ anisotropy: v }),
      },
      temperature: {
        value: 0.2, min: 0.0, max: 0.5, step: 0.01, label: 'Temperature',
        onChange: (v) => setParams({ temperature: v }),
      },
      defectRate: {
        value: 0.005, min: 0.0, max: 0.05, step: 0.001, label: 'Defect Rate',
        onChange: (v) => setParams({ defectRate: v }),
      },
      seedCount: {
        value: 1, min: 1, max: 8, step: 1, label: 'Seed Count',
        onChange: (v) => setParams({ seedCount: v }),
      },
      gridSize: {
        value: 40, min: 20, max: 80, step: 5, label: 'Grid Size',
        onChange: (v) => setParams({ gridSize: v }),
      },
      maxSteps: {
        value: 200, min: 50, max: 500, step: 10, label: 'Max Steps',
        onChange: (v) => setParams({ maxSteps: v }),
      },
    }),
    Playback: folder({
      speed: {
        value: 10, min: 1, max: 60, step: 1, label: 'Speed (tps)',
        onChange: (v) => setSpeed(v),
      },
      'Play / Pause': button(() => {
        const s = useSimStore.getState()
        s.setRunning(!s.running)
      }),
      'Reset': button(() => reset()),
    }),
  })

  return null
}
