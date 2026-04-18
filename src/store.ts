import { create } from 'zustand'
import { SimParams, DEFAULT_PARAMS } from './sim/params'
import { LatticeState, createInitialState } from './sim/growth'

interface SimStore {
  params: SimParams
  lattice: LatticeState
  running: boolean
  speed: number  // ticks per second
  setParams: (p: Partial<SimParams>) => void
  setLattice: (l: LatticeState) => void
  setRunning: (r: boolean) => void
  setSpeed: (s: number) => void
  reset: () => void
}

export const useSimStore = create<SimStore>((set, get) => ({
  params: DEFAULT_PARAMS,
  lattice: createInitialState(DEFAULT_PARAMS),
  running: false,
  speed: 10,
  setParams: (p) => set((s) => ({ params: { ...s.params, ...p } })),
  setLattice: (l) => set({ lattice: l }),
  setRunning: (r) => set({ running: r }),
  setSpeed: (s) => set({ speed: s }),
  reset: () => {
    const { params } = get()
    set({ lattice: createInitialState(params), running: false })
  },
}))
