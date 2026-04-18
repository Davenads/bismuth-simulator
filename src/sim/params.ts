export interface SimParams {
  gridSize: number
  coolingRate: number
  supersaturation: number
  anisotropy: number      // controls hollowThreshold: higher = more hollow faces
  defectRate: number
  seedCount: number
  temperature: number
  maxSteps: number
}

export const DEFAULT_PARAMS: SimParams = {
  gridSize: 40,
  coolingRate: 0.25,
  supersaturation: 0.55,
  anisotropy: 10.0,
  defectRate: 0.002,
  seedCount: 1,
  temperature: 0.15,
  maxSteps: 200,
}
