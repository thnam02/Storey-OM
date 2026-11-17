# Storey

A CRM where the home screen is a 3D model of the company: an office building with one department per floor, plus a separate warehouse. Click a floor to open that department.

See [CLAUDE.md](CLAUDE.md) for the product brief, decisions and build order. The original single-file prototype is in [prototype/index.html](prototype/index.html).

## Run it

```bash
npm install
npm run dev
```

Other scripts: `npm run build`, `npm run typecheck`, `npm test`.

## Database

The schema is plain Postgres in Supabase's layout. The app doesn't read from it yet; that comes in step 5.

```
supabase/
  config.toml                 Supabase CLI project config (Postgres 17)
  migrations/                 schema: tables, enums, rules, derived views
  seed.sql                    SAMPLE DATA, generated; do not edit by hand
db/
  seed/                       builds seed.sql from the sample data in src/data
  schema.test.ts              loads both into PGlite and checks the figures
```

- `npm run db:seed` regenerates `supabase/seed.sql` after the sample data changes. A test fails if it is out of date.
- `npm test` also runs the schema and seed against PGlite (Postgres in WebAssembly), so no database server is needed.
- To run it in a local Supabase (needs Docker): `npx supabase start`, then `npm run db:reset` to apply the migrations and the seed.
- To use a hosted project: `npx supabase link --project-ref <ref>`, then `npx supabase db push`. Load the seed only into a project meant for sample data.

Notes on the design:

- **Derived, not stored.** Workload state, the pipeline, receivables, overdue invoices and win rate are computed from rows (`employee_workload`, `pipeline_by_stage`, `open_invoices`). The prototype only lists the biggest deals and invoices, so the seed generates smaller ones to make the totals match.
- **From other systems.** Figures that will come from the bank, accounting or warehouse system until they are connected (cash, monthly revenue, margin, marketing budget, trucks and orders today) live in `company_figures`.
- **Tasks link to CRM records** through `linked_type` and `linked_id`. A trigger checks that the record exists, and another keeps delegation inside a department.
- **"Today" is pinned** to 17 Nov 2026 for the sample data (`app_settings.today`), so overdue and this-week figures keep their meaning.
- **Row-level security is on for every table, with no policies yet**, so the Supabase API exposes nothing. Policies come with auth in step 6, and step 5 will need read and write access for the app.

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
  panels/    2D side panel: overview, department Team/Workspace tabs, person view
```

## Status

Build steps 1 to 3 are done: the 3D site, camera, hover, click and labels; floor-plan mode with generated seating, people with workload status rings and name tags; and the side panels (company overview, each department's Team and Workspace tabs, and the person view with assigning and delegating). All data is hard-coded sample data, and changes last until you reload. Step 4 adds the database schema and a generated seed of the same sample data (see Database); the app does not use them yet. Step 5 (persist tasks through the database) is next.
