# Bismuth Crystal Simulator

An interactive browser-based simulator that grows bismuth hopper crystals from tunable initial conditions. The goal is emergent complexity: simple physical rules produce the stepped-pyramid geometry and iridescent coloring that make real bismuth crystals visually striking.

## What it does

Bismuth crystallizes in a rhombohedral lattice (space group R-3m) and, when grown slowly from a melt, forms hopper crystals -- stepped hollow pyramids where corners and edges grow much faster than face centers. The oxide layer (Bi2O3) that forms on exposure to air creates thin-film interference, producing the characteristic rainbow banding.

This simulator models that process with a cellular automaton running on a rhombohedral grid. Each tick, empty sites adjacent to the crystal are scored by how closely their direction from the crystal center aligns with a [111]-family corner direction. Corner-aligned sites grow with high probability; face-center sites are suppressed. The hollow stepped structure emerges from this rule without being manually scripted.

Coloring maps to height along the [111] growth axis, cycling through the Bi2O3 interference palette -- mimicking how oxide thickness varies per crystal layer.

## Parameters

| Parameter | Effect |
|---|---|
| Cooling Rate | How quickly growth probability drops over time. Low values produce large ordered hoppers; high values produce polycrystalline chaos. |
| Supersaturation | Overall density of the growth environment. Higher values fill in faster. |
| Anisotropy | How sharply corner preference falls off toward face directions. The key parameter for hopper structure -- increase it to get more pronounced hollow pyramids. |
| Temperature | Thermal noise amplitude. Higher values introduce randomness and defects. |
| Defect Rate | Probability of random nucleation events away from the main crystal. |
| Seed Count | Number of competing nucleation sites. Multiple seeds produce polycrystalline growth. |
| Grid Size | Extent of the simulation lattice. Larger grids allow bigger crystals at the cost of performance. |
| Max Steps | Total simulation length. |

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` (or the port Vite reports), adjust parameters in the panel, and click Play / Pause to start growth.

## Tech stack

- Vite + React + TypeScript
- React Three Fiber and Three.js for WebGL rendering
- Leva for the parameter panel
- Zustand for simulation state

## Project structure

```
src/
  sim/
    lattice.ts    -- Rhombohedral basis vectors and key encoding
    growth.ts     -- Cellular automaton tick and corner-alignment scoring
    params.ts     -- Parameter types and defaults
  render/
    CrystalMesh.tsx  -- Instanced mesh with per-layer iridescence coloring
    Scene.tsx        -- R3F canvas, lighting, camera, animation loop
  ui/
    Controls.tsx  -- Leva panel wired to simulation parameters
    Overlay.tsx   -- Step counter and status display
  store.ts        -- Zustand store
```

## Background

Real bismuth hopper crystals form because corners and edges of the growing crystal deplete the surrounding supersaturated solution faster than face centers can be supplied. This diffusion gradient, combined with the anisotropic surface energy of the rhombohedral lattice, drives preferential corner growth. The simulator approximates this with a direction-scoring model rather than full diffusion simulation, which keeps it interactive while preserving the qualitative emergent behavior.
