# Storey

A CRM where the home screen is a 3D model of the company: an office building with one department per floor, plus a separate warehouse. Click a floor to open that department.

See [CLAUDE.md](CLAUDE.md) for the product brief, decisions and build order. The original single-file prototype is in [prototype/index.html](prototype/index.html).

## Run it

```bash
npm install
npm run dev
```

Other scripts: `npm run build`, `npm run typecheck`, `npm test`.

## Layout

```
src/
  data/      sample company data (clearly marked), domain types, derived status
  state/     Zustand UI store (selection, hover, camera) and URL hash sync
  lib/       seeded random, formatting, reduced-motion hook
  scene/     3D layer (React Three Fiber): reads state, emits hover/selection only
    office/      floors, per-department furniture, roof
    warehouse/   shell, racks, forklift, loading dock
    site/        ground, road, trees, traffic
    props/       shared primitives, furniture, vehicles
    labels/      DOM labels projected over the scene
  panels/    2D side panel (placeholder until build step 3)
```

## Status

Build steps 1 to 3 are done: the 3D site, camera, hover, click and labels; floor-plan mode with generated seating, people with workload status rings and name tags; and the side panels (company overview, each department's Team and Workspace tabs, and the person view with assigning and delegating). All data is hard-coded sample data, and changes last until you reload. Step 4 (database schema and seed) is next.
