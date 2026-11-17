-- Storey: initial schema (build order step 4).
--
-- Company structure, people and tasks, and the CRM records tasks link to.
-- Figures shown in the app are derived from these rows where the rows exist
-- (workload, pipeline, receivables); figures that will come from other
-- systems (bank, accounting, warehouse system) live in company_figures.
--
-- Row-level security is enabled on every table with no policies yet, so the
-- public API exposes nothing until the policies for managers and directors
-- are added (build order steps 5 and 6).

-- ------------------------------------------------------------------
-- Types
-- ------------------------------------------------------------------

create type building_kind as enum ('office', 'warehouse');
create type presence as enum ('at_desk', 'in_meeting', 'away', 'on_floor', 'off_shift');
create type task_status as enum ('todo', 'doing', 'done');
create type linked_type as enum ('deal', 'invoice', 'bill', 'shipment', 'product', 'approval', 'campaign', 'order');
create type deal_stage as enum ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');
create type invoice_status as enum ('open', 'paid', 'void');
create type bill_status as enum ('open', 'paid');
create type campaign_status as enum ('planned', 'live', 'ended');
create type approval_state as enum ('waiting', 'approved', 'declined');
create type shipment_direction as enum ('import', 'export');
create type shipment_mode as enum ('sea', 'air', 'road');
create type shipment_status as enum ('booked', 'in_transit', 'at_customs', 'delivered');
create type order_status as enum ('open', 'picked', 'packed', 'dispatched');
create type movement_kind as enum ('receive', 'put_away', 'pick', 'dispatch', 'move', 'adjust');
create type activity_action as enum ('assign', 'delegate', 'complete', 'reopen', 'approve', 'decline', 'undo_decision');

-- ------------------------------------------------------------------
-- Settings and the app's notion of "today"
-- ------------------------------------------------------------------

-- Small key/value settings: dataset ('sample' or 'live'), time zone, and a
-- pinned "today" so sample data keeps its meaning on any real date.
create table app_settings (
  key text primary key check (key in ('dataset', 'today', 'timezone', 'currency')),
  value text not null
);

create function app_timezone() returns text
language sql stable
set search_path = public
as $$
  select coalesce((select value from app_settings where key = 'timezone'), 'Australia/Sydney')
$$;

-- The pinned sample date when set, otherwise the current date in the company's time zone.
create function app_today() returns date
language sql stable
set search_path = public
as $$
  select coalesce(
    (select value::date from app_settings where key = 'today'),
    (now() at time zone app_timezone())::date
  )
$$;

-- Monday of the current week.
create function app_week_start() returns date
language sql stable
set search_path = public
as $$
  select app_today() - (extract(isodow from app_today())::int - 1)
$$;

-- ------------------------------------------------------------------
-- Company structure and people
-- ------------------------------------------------------------------

create table departments (
  id text primary key check (id ~ '^[a-z][a-z-]*$'),
  name text not null unique,
  color text not null check (color ~ '^#[0-9a-f]{6}$'),
  building building_kind not null,
  -- Office floor number (1 = ground); 0 for the warehouse building.
  level smallint not null check (level >= 0),
  constraint office_floors_have_a_level check ((building = 'office') = (level > 0)),
  unique (building, level)
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  -- Used in links (#p-linh-nguyen).
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  department_id text not null references departments,
  name text not null,
  role text not null,
  presence presence not null default 'at_desk',
  -- What they are doing on the floor when it changes how they are drawn.
  activity text check (activity in ('forklift')),
  is_manager boolean not null default false,
  created_at timestamptz not null default now()
);
create index employees_department_idx on employees (department_id);
create unique index employees_one_manager_per_department on employees (department_id) where is_manager;

-- ------------------------------------------------------------------
-- Sales and marketing
-- ------------------------------------------------------------------

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers,
  title text not null,
  stage deal_stage not null,
  value numeric(12, 2) not null check (value >= 0),
  owner_id uuid references employees on delete set null,
  -- Expected close for open deals.
  close_date date,
  -- When a deal was won or lost.
  closed_on date,
  created_at timestamptz not null default now(),
  constraint closed_deals_have_a_date check ((stage in ('won', 'lost')) = (closed_on is not null))
);
create index deals_stage_idx on deals (stage);
create index deals_owner_idx on deals (owner_id);
create index deals_customer_idx on deals (customer_id);

-- Calls, demos and visits on the sales calendar.
create table sales_activities (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  customer_id uuid not null references customers,
  deal_id uuid references deals on delete set null,
  owner_id uuid references employees on delete set null,
  starts_at timestamptz not null
);
create index sales_activities_starts_idx on sales_activities (starts_at);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  channel text not null,
  status campaign_status not null,
  -- Lead count until leads are their own records.
  leads integer not null default 0 check (leads >= 0),
  spend numeric(12, 2) not null default 0 check (spend >= 0),
  starts_on date,
  ends_on date
);

-- Planned sends, launches and posts.
create table marketing_calendar (
  id uuid primary key default gen_random_uuid(),
  happens_on date not null,
  description text not null,
  campaign_id uuid references campaigns on delete set null
);

-- ------------------------------------------------------------------
-- Finance
-- ------------------------------------------------------------------

-- Overdue is derived: open with a due date before today.
create table invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  customer_id uuid not null references customers,
  amount numeric(12, 2) not null check (amount > 0),
  issued_on date not null,
  due_date date not null,
  status invoice_status not null default 'open',
  paid_on date,
  constraint paid_invoices_have_a_date check ((status = 'paid') = (paid_on is not null)),
  constraint due_after_issue check (due_date >= issued_on)
);
create index invoices_open_idx on invoices (due_date) where status = 'open';

-- ------------------------------------------------------------------
-- Import, export and the warehouse
-- ------------------------------------------------------------------

create table warehouse_zones (
  code text primary key check (code ~ '^[A-Z]$'),
  label text not null,
  slots integer not null check (slots > 0),
  slots_used integer not null check (slots_used between 0 and slots)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  on_hand integer not null default 0 check (on_hand >= 0),
  reorder_at integer not null default 0 check (reorder_at >= 0),
  zone_code text references warehouse_zones
);

create table shipments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^(IMP|EXP)-[0-9]+$'),
  direction shipment_direction not null,
  origin text not null,
  destination text not null,
  mode shipment_mode not null,
  -- "2 × 40ft", "18 pallets"
  load_description text not null,
  goods text not null,
  eta date not null,
  status shipment_status not null,
  constraint code_matches_direction check ((direction = 'import') = (code like 'IMP-%'))
);

create table shipment_items (
  shipment_id uuid not null references shipments on delete cascade,
  product_id uuid not null references products,
  quantity integer check (quantity > 0),
  primary key (shipment_id, product_id)
);

-- Documents and bookings still needed for a shipment.
create table shipment_paperwork (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments on delete cascade,
  description text not null,
  done_at timestamptz
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  -- Purchase order or supplier reference, e.g. PO-879.
  reference text unique,
  shipment_id uuid references shipments on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  due_date date not null,
  status bill_status not null default 'open',
  paid_on date,
  constraint paid_bills_have_a_date check ((status = 'paid') = (paid_on is not null))
);

create table sales_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique check (number ~ '^SO-[0-9]+$'),
  customer_id uuid not null references customers,
  status order_status not null default 'open',
  created_at timestamptz not null default now()
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  kind movement_kind not null,
  product_id uuid references products,
  quantity integer,
  from_zone text references warehouse_zones,
  to_zone text references warehouse_zones,
  -- Order, shipment or customer the movement was for.
  reference text,
  description text not null,
  happened_at timestamptz not null default now()
);
create index stock_movements_happened_idx on stock_movements (happened_at desc);

-- ------------------------------------------------------------------
-- Management
-- ------------------------------------------------------------------

create table approvals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric(12, 2) check (amount > 0),
  requested_by_department text not null references departments,
  requested_by uuid references employees on delete set null,
  state approval_state not null default 'waiting',
  decided_by uuid references employees on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint decisions_have_a_time check ((state = 'waiting') = (decided_at is null))
);
create index approvals_waiting_idx on approvals (created_at) where state = 'waiting';

-- Company goals for a period. Metric goals (revenue) are measured from data;
-- the rest carry a progress percentage someone updates.
create table goals (
  id uuid primary key default gen_random_uuid(),
  period text not null check (period ~ '^[0-9]{4}-Q[1-4]$'),
  name text not null,
  metric text check (metric in ('revenue')),
  target_amount numeric(14, 2) check (target_amount > 0),
  progress_pct smallint check (progress_pct between 0 and 100),
  sort smallint not null default 0,
  constraint metric_or_progress check ((metric is null) = (progress_pct is not null)),
  constraint metric_goals_have_a_target check (metric is null or target_amount is not null)
);

-- Figures that come from other systems until they are connected: bank
-- balance, accounting revenue and margin, marketing budget and conversion,
-- warehouse traffic. One value per key and period.
create table company_figures (
  key text not null check (key in (
    'cash_balance', 'revenue', 'gross_margin_pct', 'marketing_budget',
    'lead_conversion_pct', 'inbound_trucks', 'outbound_orders'
  )),
  -- The day, or the first day of the month or year, the value is for.
  period date not null,
  value numeric(14, 2) not null,
  source text not null default 'manual',
  primary key (key, period)
);

-- ------------------------------------------------------------------
-- Tasks: the heart of the product, linked to CRM records
-- ------------------------------------------------------------------

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  status task_status not null default 'todo',
  due_date date not null,
  done_at timestamptz,
  assignee_id uuid not null references employees,
  created_by uuid references employees on delete set null,
  -- Who had the task before it was delegated.
  delegated_from_id uuid references employees on delete set null,
  linked_type linked_type,
  linked_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint done_tasks_have_a_time check ((status = 'done') = (done_at is not null)),
  constraint link_is_complete check ((linked_type is null) = (linked_id is null)),
  constraint not_delegated_to_self check (delegated_from_id is distinct from assignee_id)
);
create index tasks_assignee_open_idx on tasks (assignee_id) where status <> 'done';
create index tasks_assignee_idx on tasks (assignee_id);
create index tasks_linked_idx on tasks (linked_type, linked_id);

-- A task's linked record must exist in the table its type names.
create function check_task_link() returns trigger
language plpgsql
set search_path = public
as $$
declare
  found boolean;
begin
  if new.linked_type is null then
    return new;
  end if;
  found := case new.linked_type
    when 'deal' then exists (select 1 from deals where id = new.linked_id)
    when 'invoice' then exists (select 1 from invoices where id = new.linked_id)
    when 'bill' then exists (select 1 from bills where id = new.linked_id)
    when 'shipment' then exists (select 1 from shipments where id = new.linked_id)
    when 'product' then exists (select 1 from products where id = new.linked_id)
    when 'approval' then exists (select 1 from approvals where id = new.linked_id)
    when 'campaign' then exists (select 1 from campaigns where id = new.linked_id)
    when 'order' then exists (select 1 from sales_orders where id = new.linked_id)
  end;
  if not found then
    raise exception 'Task links to a % that does not exist: %', new.linked_type, new.linked_id
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end
$$;

create trigger tasks_check_link
  before insert or update of linked_type, linked_id on tasks
  for each row execute function check_task_link();

-- v1 rule: delegation stays inside the department (cross-department requests come later).
create function check_task_delegation() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.delegated_from_id is not null
     and (select department_id from employees where id = new.delegated_from_id)
         is distinct from (select department_id from employees where id = new.assignee_id) then
    raise exception 'Tasks can only be delegated within a department'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger tasks_check_delegation
  before insert or update of assignee_id, delegated_from_id on tasks
  for each row execute function check_task_delegation();

create function touch_updated_at() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger tasks_touch_updated_at
  before update on tasks
  for each row execute function touch_updated_at();

-- Who did what, for audit: assign, delegate, complete, approve.
create table activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid references employees on delete set null,
  action activity_action not null,
  entity_type text not null check (entity_type in ('task', 'approval')),
  entity_id uuid not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_entity_idx on activity_log (entity_type, entity_id);
create index activity_log_created_idx on activity_log (created_at desc);

-- ------------------------------------------------------------------
-- Derived views (never stored). security_invoker so row-level security
-- applies to whoever queries them.
-- ------------------------------------------------------------------

-- Workload per person: any overdue task → late; 6 or more open → busy; else ok.
create view employee_workload with (security_invoker = true) as
select
  e.id as employee_id,
  e.department_id,
  count(t.id) filter (where t.status <> 'done')::int as open,
  count(t.id) filter (where t.status = 'doing')::int as doing,
  count(t.id) filter (where t.status = 'todo')::int as todo,
  count(t.id) filter (where t.status <> 'done' and t.due_date < app_today())::int as overdue,
  count(t.id) filter (
    where t.status = 'done' and (t.done_at at time zone app_timezone())::date >= app_week_start()
  )::int as done_this_week,
  case
    when count(t.id) filter (where t.status <> 'done' and t.due_date < app_today()) > 0 then 'late'
    when count(t.id) filter (where t.status <> 'done') >= 6 then 'busy'
    else 'ok'
  end as state
from employees e
left join tasks t on t.assignee_id = e.id
group by e.id, e.department_id;

-- Open pipeline by stage.
create view pipeline_by_stage with (security_invoker = true) as
select stage, count(*)::int as deals, sum(value) as value
from deals
where stage in ('lead', 'qualified', 'proposal', 'negotiation')
group by stage;

-- Open invoices with their overdue flag.
create view open_invoices with (security_invoker = true) as
select i.*, c.name as customer_name, i.due_date < app_today() as is_overdue
from invoices i
join customers c on c.id = i.customer_id
where i.status = 'open';

-- ------------------------------------------------------------------
-- Row-level security: on everywhere, policies come with auth (step 6).
-- ------------------------------------------------------------------

alter table app_settings enable row level security;
alter table departments enable row level security;
alter table employees enable row level security;
alter table customers enable row level security;
alter table deals enable row level security;
alter table sales_activities enable row level security;
alter table campaigns enable row level security;
alter table marketing_calendar enable row level security;
alter table invoices enable row level security;
alter table warehouse_zones enable row level security;
alter table products enable row level security;
alter table shipments enable row level security;
alter table shipment_items enable row level security;
alter table shipment_paperwork enable row level security;
alter table bills enable row level security;
alter table sales_orders enable row level security;
alter table stock_movements enable row level security;
alter table approvals enable row level security;
alter table goals enable row level security;
alter table company_figures enable row level security;
alter table tasks enable row level security;
alter table activity_log enable row level security;
