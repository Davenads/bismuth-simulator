# Bismuth Crystal Simulator — Project Plan

## Concept

An interactive browser-based simulator that models bismuth's rhombohedral lattice and grows hopper crystal structures from user-defined initial conditions. The goal is emergent complexity: simple physical rules (surface energy, anisotropic bonding, cooling rate) produce the visually striking stepped-pyramid geometry bismuth is known for.

---

## Crystal Science Background

Bismuth adopts a **rhombohedral (R-3m) lattice** — a distorted simple cubic structure with:
- Two atoms per unit cell
- ~3% distortion from cubic symmetry along the [111] axis
- Strong anisotropic bond energy (faces grow slower than edges/corners)

This anisotropy is the engine of **hopper crystal formation**: edges and corners grow faster than face centers, leaving hollow stepped pyramids. The iridescent oxide layer is a bonus visual — thin-film interference from Bi₂O₃.

---

## Simulation Model

### Growth Algorithm: Anisotropic Cellular Automaton

Each site on the lattice has a state: empty or filled. Each tick, empty sites adjacent to filled sites calculate a **growth probability** based on:

```
P(growth) = f(neighbors, surface_energy_anisotropy, temperature, supersaturation)
```

Key parameters the user can tune:
| Parameter | Effect |
|---|---|
| **Cooling Rate** | Slow = large ordered hoppers; fast = polycrystalline chaos |
| **Supersaturation** | Low = sparse growth; high = dense fill |
| **Anisotropy Factor** | Controls how much faster edges grow vs. faces |
| **Noise / Defect Rate** | Seeds dislocations and twinning |
| **Seed Count** | Single crystal vs. competing nucleation sites |
| **Temperature** | Affects thermal fluctuation amplitude |

### Lattice Representation

Use a 3D integer grid mapped to rhombohedral coordinates via a basis transform:

```
[a, b, c] (rhombohedral) → [x, y, z] (Cartesian)

Basis vectors (approximate):
a1 = (0.89, 0, 0.45)
a2 = (-0.45, 0.77, 0.45)
a3 = (-0.45, -0.77, 0.45)
```

### Rendering

Each filled voxel rendered as an instanced mesh (cube or rhomboid). Color encodes:
- **Growth step** (age of crystal layer) → hue shift simulating oxide iridescence
- **Face normal** → specular shading to show stepped geometry

---

## Recommended Tech Stack

### Core

| Tool | Role |
|---|---|
| **Vite + TypeScript** | Build tooling, type-safe lattice math |
| **React** | UI shell, parameter panel |
| **React Three Fiber (R3F)** | Declarative Three.js — 3D scene, camera, lights |
| **@react-three/drei** | Orbit controls, environment maps, instances |
| **Three.js** | Underlying WebGL renderer |

### UI Controls

| Tool | Role |
|---|---|
| **Leva** | Floating parameter panel with sliders/knobs — zero config |

### Simulation

| Tool | Role |
|---|---|
| **Pure TypeScript** | Cellular automaton tick logic (runs in main thread initially) |
| **Web Worker** (phase 2) | Offload simulation ticks to keep UI responsive |
| **WebGPU compute** (phase 3) | GPU-accelerated lattice update for large grids |

### Optional Extras

| Tool | Role |
|---|---|
| **@react-spring/three** | Animate crystal growth frame-by-frame |
| **Zustand** | Lightweight state for sim params + lattice snapshot |

---

## Project Structure

```
bismuth-simulator/
├── src/
│   ├── sim/
│   │   ├── lattice.ts          # Rhombohedral grid, neighbor lookup
│   │   ├── growth.ts           # Cellular automaton tick function
│   │   └── params.ts           # Typed parameter schema
│   ├── render/
│   │   ├── CrystalMesh.tsx     # Instanced mesh from lattice snapshot
│   │   ├── Scene.tsx           # R3F canvas, lighting, camera
│   │   └── shaders/            # Custom GLSL for iridescence effect
│   ├── ui/
│   │   ├── Controls.tsx        # Leva panel wired to sim params
│   │   └── Overlay.tsx         # Play/pause/reset, stats display
│   └── main.tsx
├── public/
└── package.json
```

---

## Phased Roadmap

### Phase 1 — Static Lattice Viewer
- Render a pre-computed rhombohedral unit cell in R3F
- Orbit controls, basic lighting
- Confirm coordinate transform is correct visually

### Phase 2 — Live Growth Simulation
- Implement CA tick in TypeScript
- Wire Leva controls to params
- Animate growth step by step with play/pause

### Phase 3 — Visual Polish
- Iridescence shader (thin-film GLSL)
- Step-age coloring
- Ambient occlusion, bloom post-processing

### Phase 4 — Performance
- Move simulation to Web Worker
- InstancedMesh with dynamic buffer updates (no re-allocation per tick)
- Optional WebGPU compute shader for grid update

---

## Bootstrapping

```bash
npm create vite@latest bismuth-simulator -- --template react-ts
cd bismuth-simulator
npm install three @react-three/fiber @react-three/drei leva zustand
npm install -D @types/three
npm run dev
```

---

## Key Design Principle

> The user never directly places atoms. They set **physical conditions**; the simulation produces the structure. Complexity emerges from rules, not manual construction.

This means every parameter should map to a real physical quantity, and the UI should frame it as such ("Cooling Rate" not "edge bias multiplier").
