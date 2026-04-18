export interface SimParams {
  gridSize: number
  coolingRate: number       // 0–1: slow=0.1 (large hoppers), fast=1.0 (poly chaos)
  supersaturation: number   // 0–1: density of growth probability
  anisotropy: number        // 1–10: edge/corner vs face growth ratio
  defectRate: number        // 0–0.2: probability of random nucleation
  seedCount: number         // 1–8: competing nucleation sites
  temperature: number       // 0–1: thermal fluctuation amplitude
  maxSteps: number
}

export const DEFAULT_PARAMS: SimParams = {
  gridSize: 40,
  coolingRate: 0.25,
  supersaturation: 0.5,
  anisotropy: 8.0,
  defectRate: 0.005,
  seedCount: 1,
  temperature: 0.2,
  maxSteps: 200,
}
