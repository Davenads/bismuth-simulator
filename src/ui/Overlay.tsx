import { useSimStore } from '../store'

export function Overlay() {
  const { lattice, params, running } = useSimStore()
  const pct = Math.round((lattice.step / params.maxSteps) * 100)

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: 20, zIndex: 100,
      color: '#aaa', fontFamily: 'monospace', fontSize: 12,
      background: 'rgba(0,0,0,0.5)', padding: '8px 12px', borderRadius: 6,
      pointerEvents: 'none',
    }}>
      <div style={{ color: running ? '#7fff7f' : '#ff9966' }}>
        {running ? 'GROWING' : lattice.step >= params.maxSteps ? 'COMPLETE' : 'PAUSED'}
      </div>
      <div>Step {lattice.step} / {params.maxSteps} ({pct}%)</div>
      <div>Sites {lattice.filled.size.toLocaleString()}</div>
    </div>
  )
}
