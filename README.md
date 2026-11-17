# Storey

A CRM where the home screen is a 3D model of the company: an office building with one department per floor, plus a separate warehouse. Click a floor to open that department.

See [CLAUDE.md](CLAUDE.md) for the product brief, decisions and build order. The original single-file prototype is in [prototype/index.html](prototype/index.html).

## Run it

```bash
npm install
npm run dev
```

Other scripts: `npm run build`, `npm run typecheck`, `npm test`.

### Browser tests

`npm run test:e2e` runs the key flows in Chrome with Playwright (the Chrome installed on your machine; no browser download): open a floor, open a person, assign, delegate, mark done and reopen; the activity log; what each role can open; approvals; and the sign-in screen (with the auth API mocked). It starts its own dev servers on ports 5180 and 5181.

`npm run test:e2e:supabase` signs in for real against a local Supabase (start it first with `npx supabase start`), reading the sign-in emails from the local test inbox. It uses port 5173, where Supabase sends sign-in links, so stop `npm run dev` first. Every change it makes is undone, so it can run again on the same database.

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
e2e/                          Playwright browser tests of the key flows
```

- `npm run db:seed` regenerates `supabase/seed.sql` after the sample data changes. A test fails if it is out of date.
- `npm test` also runs the schema, seed and database functions in PGlite (Postgres in WebAssembly), so no database server is needed.
- To run against a local Supabase (needs Docker): `npx supabase start`, then `npm run db:reset` to apply the migrations and seed. Copy `.env.example` to `.env.local` and fill in the API URL and anon key it prints, then `npm run dev` and open http://localhost:5173. Sign in with a sample account (below); the sign-in email arrives in the local test inbox at http://127.0.0.1:54324.
- To use a hosted project: `npx supabase link --project-ref <ref>`, then `npx supabase db push`. Load the seed only into a project meant for sample data. In the project's auth settings, keep **Confirm email** on and add the app's address to the redirect URLs.

Notes on the design:

- **Derived, not stored.** Workload state, the pipeline, receivables, overdue invoices and win rate are computed from rows (`employee_workload`, `pipeline_by_stage`, `open_invoices`). The prototype only lists the biggest deals and invoices, so the seed generates smaller ones to make the totals match.
- **From other systems.** Figures that will come from the bank, accounting or warehouse system until they are connected (cash, monthly revenue, margin, marketing budget, trucks and orders today) live in `company_figures`.
- **Tasks link to CRM records** through `linked_type` and `linked_id`. A trigger checks that the record exists, and another keeps delegation inside a department.
- **"Today" is pinned** to 17 Nov 2026 for the sample data (`app_settings.today`), so overdue and this-week figures keep their meaning.
- **Changes go through database functions**: `assign_task`, `delegate_task`, `complete_task`, `reopen_task` and `decide_approval`. Each writes the change and its `activity_log` entry in one transaction. Tables have no write policies, so these functions are the only way to change data.
- **Changes are checked by role.** Managers can assign, delegate and complete tasks only for people in their own department; only directors decide approvals.

## Sign-in and roles

People sign in with an emailed link (Supabase Auth, no passwords). An account acts as the employee whose `email` matches it, once the address is confirmed, and only if that employee has app access (`employees.access`):

| Role | Sees | Can change |
|---|---|---|
| `director` | every department | tasks anywhere; approvals |
| `manager` | their own department | tasks in their department |
| none | nothing | nothing |

Every signed-in manager can see the staff directory, departments, customers and company goals. Tasks, the activity log and each department's records (deals, campaigns, invoices, shipments, stock and so on) are limited by row-level security to the departments the viewer can see. Import & Export and the Warehouse share shipments and stock. A task's linked record keeps its label (an invoice number, a shipment code) even when the record belongs to another department. In the app, departments outside your access are locked, in 3D and in the panels.

To give someone access, set their work email and role on their employee record:

```sql
update employees set email = 'rachel@yourcompany.com', access = 'manager' where slug = 'rachel-tan';
```

Sample accounts (`firstname.lastname@storey.example`, a reserved domain, so mail only reaches the local test inbox):

| Account | Role |
|---|---|
| michael.chen@storey.example | Director (managing director) |
| thao.nguyen@storey.example, andrew.walsh@storey.example | Director |
| daniel.reid@storey.example | Manager, Sales |
| emma.lawson@storey.example | Manager, Marketing |
| rachel.tan@storey.example | Manager, Finance |
| tuan.ho@storey.example | Manager, Import & Export |
| steve.collins@storey.example | Manager, Warehouse |

Without a database there is no sign-in: a **View as** menu in the header picks which of these people to use the app as, and the app shows exactly what the database would show them (a test checks this for every account).

The employee view (later) will add a role scoped to a person's own desk and tasks: extend `app_role` and `visible_departments()`, and add a policy on `tasks`.

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

Build steps 1 to 3 are done: the 3D site, camera, hover, click and labels; floor-plan mode with generated seating, people with workload status rings and name tags; and the side panels (company overview, each department's Team and Workspace tabs, and the person view with assigning and delegating). All data is hard-coded sample data, and changes last until you reload. Step 4 added the database schema and a generated seed of the same sample data. Step 5 saves assign, delegate, mark done, reopen and approvals through database functions with an activity log, and shows recent activity in the panels. Step 6 adds sign-in and roles: directors see every department, managers their own. Without Supabase configured the app still runs on the in-memory sample, with a View as menu in place of sign-in. Step 7 (employee view, chat integration, real seating plans, cross-department requests) is next.
