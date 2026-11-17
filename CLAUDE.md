# 3D Company CRM (working name: Storey)

A CRM where the home screen is a 3D model of the company: an office building with one department per floor, plus a separate warehouse building. A manager clicks a floor to open that department's floor plan, sees every employee at their desk with a workload status, and clicks a person to see and manage their tasks.

The working prototype is `prototype/index.html` (single file, Three.js r128, sample data). Treat it as the visual and behavioural reference, not as code to keep. Open it in a browser before starting.

## Decisions already made

- **Users (v1):** managers only. An employee view (my desk, my tasks) comes later; design permissions so it can be added.
- **3D is for navigation only.** Building → floor plan → person. All real work (tables, tasks, forms) happens in flat 2D panels beside the 3D view. Never put tables or forms inside the 3D scene.
- **"Report" means task status:** in progress, to do, done (this week), overdue. No separate written reports in v1.
- **Messaging:** do not build chat. Link out to the company's existing tool (Slack, Microsoft Teams or Zalo) later via an integration. v1 shows a placeholder button.
- **Floor layouts are generated** from the number of people per department, not drawn from the real office.
- **Tasks link to CRM records** (deal, invoice, shipment, product, approval). This is the main difference from generic task tools; keep it central.
- **Delegation:** a manager can reassign a task to someone in the same department. Cross-department requests come later.
- **Warehouse** is its own building. Staff are on shift or off shift; only on-shift staff appear in 3D.

## Departments (v1)

| Floor | Department | Workspace content |
|---|---|---|
| Level 1 | Import & Export | Shipments (import/export, route, mode, ETA, status incl. customs), paperwork to do |
| Level 2 | Sales | Pipeline by stage, deals, today's activities |
| Level 3 | Marketing | Campaigns, leads by channel, spend vs budget |
| Level 4 | Finance | Cash, receivables, invoices to chase, bills to pay, revenue by month |
| Level 5 | Management | Approvals queue, company goals, team overview |
| Separate building | Warehouse | Zones and capacity, stock levels vs reorder point, stock movements |

Each department panel has two tabs: **Team** (people, open/overdue/done-this-week, overdue first) and **Workspace** (the CRM content above).

## Suggested stack (open to change)

- **Frontend:** Vite + React + TypeScript, React Three Fiber + drei for 3D, Zustand for UI state, TanStack Query for server data.
- **Backend:** Supabase (Postgres, auth, row-level security, realtime) to move fast. Alternative: Node (Fastify) + Postgres + Prisma if a custom API is preferred.
- **Testing:** Vitest for logic, Playwright for key flows (open floor → open person → assign → delegate).

## Data model (starting point)

- `departments` (id, name, color, building: office|warehouse, level)
- `employees` (id, department_id, name, role, presence: at_desk|in_meeting|away|on_floor|off_shift, is_manager)
- `tasks` (id, title, status: todo|doing|done, due_date, done_at, assignee_id, created_by, delegated_from_id, linked_type, linked_id)
- `customers`, `deals` (stage, value, owner_id, close_date)
- `invoices` (number, customer_id, amount, due_date, status), `bills`
- `shipments` (code, direction, route, mode, load, eta, status), `shipment_items` (product_id)
- `products` (sku, name, on_hand, reorder_at, zone)
- `stock_movements`, `campaigns`, `approvals` (requested_by_department, amount, state)
- `activity_log` (who did what, for audit: assign, delegate, approve)

Derived, not stored: workload state = has overdue → red; 6+ open tasks → amber; else green.

## Build order

1. Scaffold the app; port the 3D site (office floors, warehouse, camera, hover/click, labels) to React Three Fiber with hard-coded data.
2. Floor-plan mode: hide floors above, top-down camera, generated seating, people with status rings and name tags.
3. Panels: overview, department Team/Workspace tabs, person view. Match the prototype's look.
4. Database schema + seed script using the prototype's sample data.
5. Persist tasks: assign, delegate, mark done; activity log.
6. Auth and roles (manager sees own department, director sees all).
7. Later: employee view, chat integration, real seating plans, cross-department requests.

## Conventions

- Keep 3D components and data/panel components separate; the 3D layer only reads state and emits selection events.
- Generated layouts must be deterministic (seeded) so people don't move between reloads.
- Respect `prefers-reduced-motion` (no walking animations, instant camera moves).
- Sample data stays clearly marked as sample until real data is connected.
