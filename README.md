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

The schema is plain Postgres in Supabase's layout. Without a database the app runs on the built-in sample company in memory; with Supabase configured it reads everything from the database and saves changes there.

```
supabase/
  config.toml                 Supabase CLI project config (Postgres 17)
  migrations/                 schema, task actions, read views, access rules
  seed.sql                    SAMPLE DATA, generated; do not edit by hand
db/
  seed/                       builds seed.sql from the sample data in src/data
  *.test.ts                   schema, actions and app snapshot, tested in PGlite
```

- `npm run db:seed` regenerates `supabase/seed.sql` after the sample data changes. A test fails if it is out of date.
- `npm test` also runs the schema, seed and database functions in PGlite (Postgres in WebAssembly), so no database server is needed.
- To run against a local Supabase (needs Docker): `npx supabase start`, then `npm run db:reset` to apply the migrations and seed. Copy `.env.example` to `.env.local` and fill in the API URL and anon key it prints, then `npm run dev`.
- To use a hosted project: `npx supabase link --project-ref <ref>`, then `npx supabase db push`. Load the seed only into a project meant for sample data.

Notes on the design:

- **Derived, not stored.** Workload state, the pipeline, receivables, overdue invoices and win rate are computed from rows (`employee_workload`, `pipeline_by_stage`, `open_invoices`). The prototype only lists the biggest deals and invoices, so the seed generates smaller ones to make the totals match.
- **From other systems.** Figures that will come from the bank, accounting or warehouse system until they are connected (cash, monthly revenue, margin, marketing budget, trucks and orders today) live in `company_figures`.
- **Tasks link to CRM records** through `linked_type` and `linked_id`. A trigger checks that the record exists, and another keeps delegation inside a department.
- **"Today" is pinned** to 17 Nov 2026 for the sample data (`app_settings.today`), so overdue and this-week figures keep their meaning.
- **Changes go through database functions**: `assign_task`, `delegate_task`, `complete_task`, `reopen_task` and `decide_approval`. Each writes the change and its `activity_log` entry in one transaction. Tables have no write policies, so these functions are the only way to change data.
- **Access before sign-in (step 6):** while `app_settings.dataset` is `sample`, anyone with the API key can read the data and make changes as the sample viewer (Michael Chen). With any other dataset, nothing can be read or changed until roles are added in step 6. Don't load real data into a sample-mode database.

## Layout

```
src/
  data/      sample company data (clearly marked), domain types, derived status
  data/source/  where data comes from: the in-memory sample, or Supabase (rows → snapshot)
  state/     Zustand UI store (selection, hover, camera), TanStack Query server data, URL hash sync
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

Build steps 1 to 3 are done: the 3D site, camera, hover, click and labels; floor-plan mode with generated seating, people with workload status rings and name tags; and the side panels (company overview, each department's Team and Workspace tabs, and the person view with assigning and delegating). All data is hard-coded sample data, and changes last until you reload. Step 4 added the database schema and a generated seed of the same sample data. Step 5 saves assign, delegate, mark done, reopen and approvals through database functions with an activity log, and shows recent activity in the panels. Without Supabase configured the app still runs on the in-memory sample. Step 6 (sign-in and roles) is next.
