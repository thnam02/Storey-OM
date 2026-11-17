-- Storey: sign-in and roles (build order step 6).
--
-- People sign in with Supabase Auth. A signed-in account acts as the employee
-- with the same email address, once that address is confirmed, if the
-- employee has app access:
--
--   director  sees every department and decides approvals
--   manager   sees their own department
--
-- Everyone else, and anyone not signed in, sees nothing and can change
-- nothing. The staff directory, departments, customers and company goals are
-- open to every signed-in manager; tasks, activity and each department's
-- records are limited to the departments the viewer can see. Import & Export
-- and the Warehouse share shipments and stock.
--
-- The employee view (later) adds a role scoped to a person's own tasks:
-- extend app_role and visible_departments(), and add a policy on tasks.
--
-- This replaces step 5's open access to sample data: sample databases need
-- sign-in too.

-- ------------------------------------------------------------------
-- Roles and sign-in identity
-- ------------------------------------------------------------------

create type app_role as enum ('manager', 'director');

alter table employees add column email text check (email ~ '^[^@\s]+@[^@\s]+$');
alter table employees add column access app_role;
create unique index employees_email_idx on employees (lower(email));
alter table employees add constraint access_needs_an_email check (access is null or email is not null);

-- The sample viewer setting is replaced by sign-in.
delete from app_settings where key = 'viewer';
alter table app_settings drop constraint app_settings_key_check;
alter table app_settings add constraint app_settings_key_check
  check (key in ('dataset', 'today', 'timezone', 'currency'));

-- The employee the signed-in account acts as: same email, confirmed, with app access.
create or replace function current_actor() returns uuid
language sql stable security definer
set search_path = public
as $$
  select e.id
  from auth.users u
  join employees e on lower(e.email) = lower(u.email)
  where u.id = auth.uid()
    and u.email_confirmed_at is not null
    and e.access is not null
$$;

create function current_app_role() returns app_role
language sql stable security definer
set search_path = public
as $$
  select access from employees where id = current_actor()
$$;

-- Departments the viewer can see: all for a director, their own for a
-- manager, none (null) for anyone else. Policies call it as
-- (select visible_departments()) so it runs once per query, not per row.
create function visible_departments() returns text[]
language sql stable security definer
set search_path = public
as $$
  select case e.access
    when 'director' then array(select id from departments order by id)
    else array[e.department_id]
  end
  from employees e
  where e.id = current_actor()
$$;

-- ------------------------------------------------------------------
-- Who may change what (the functions run as their owner, so they check)
-- ------------------------------------------------------------------

create function require_department(p_department text) returns uuid
language plpgsql stable security definer
set search_path = public
as $$
declare
  actor uuid := require_actor();
begin
  if not coalesce(p_department = any(visible_departments()), false) then
    raise exception 'You can only manage tasks in your own department' using errcode = 'insufficient_privilege';
  end if;
  return actor;
end
$$;

create function require_task_access(p_task uuid) returns uuid
language plpgsql stable security definer
set search_path = public
as $$
declare
  dept text;
begin
  perform require_actor();
  select e.department_id into dept from tasks t join employees e on e.id = t.assignee_id where t.id = p_task;
  if not found then
    raise exception 'Task not found' using errcode = 'no_data_found';
  end if;
  return require_department(dept);
end
$$;

create or replace function assign_task(
  p_assignee uuid,
  p_title text,
  p_due date,
  p_linked_type linked_type default null,
  p_linked_id uuid default null
) returns tasks
language plpgsql security definer
set search_path = public
as $$
declare
  actor uuid := require_actor();
  t tasks;
begin
  if not exists (select 1 from employees where id = p_assignee) then
    raise exception 'That person is not in the company' using errcode = 'no_data_found';
  end if;
  perform require_department((select department_id from employees where id = p_assignee));

  insert into tasks (title, status, due_date, assignee_id, created_by, linked_type, linked_id, created_at)
  values (btrim(p_title), 'todo', p_due, p_assignee, actor, p_linked_type, p_linked_id, app_now())
  returning * into t;

  insert into activity_log (actor_id, action, entity_type, entity_id, details, created_at)
  values (actor, 'assign', 'task', t.id, jsonb_build_object('title', t.title, 'assignee', t.assignee_id), app_now());
  return t;
end
$$;

create or replace function delegate_task(p_task uuid, p_to uuid) returns tasks
language plpgsql security definer
set search_path = public
as $$
declare
  actor uuid := require_task_access(p_task);
  t tasks;
  from_id uuid;
begin
  select * into t from tasks where id = p_task for update;
  if t.status = 'done' then
    raise exception 'Only open tasks can be delegated' using errcode = 'check_violation';
  end if;
  if t.assignee_id = p_to then
    raise exception 'The task is already with that person' using errcode = 'check_violation';
  end if;
  from_id := t.assignee_id;

  update tasks set assignee_id = p_to, delegated_from_id = from_id, status = 'todo'
  where id = p_task
  returning * into t;

  insert into activity_log (actor_id, action, entity_type, entity_id, details, created_at)
  values (actor, 'delegate', 'task', t.id,
          jsonb_build_object('title', t.title, 'assignee', p_to, 'from', from_id, 'to', p_to), app_now());
  return t;
end
$$;

create or replace function complete_task(p_task uuid) returns tasks
language plpgsql security definer
set search_path = public
as $$
declare
  actor uuid := require_task_access(p_task);
  t tasks;
begin
  select * into t from tasks where id = p_task for update;
  if t.status = 'done' then
    return t;
  end if;

  update tasks set status = 'done', done_at = app_now() where id = p_task returning * into t;

  insert into activity_log (actor_id, action, entity_type, entity_id, details, created_at)
  values (actor, 'complete', 'task', t.id, jsonb_build_object('title', t.title, 'assignee', t.assignee_id), app_now());
  return t;
end
$$;

create or replace function reopen_task(p_task uuid) returns tasks
language plpgsql security definer
set search_path = public
as $$
declare
  actor uuid := require_task_access(p_task);
  t tasks;
begin
  select * into t from tasks where id = p_task for update;
  if t.status <> 'done' then
    return t;
  end if;

  update tasks set status = 'todo', done_at = null where id = p_task returning * into t;

  insert into activity_log (actor_id, action, entity_type, entity_id, details, created_at)
  values (actor, 'reopen', 'task', t.id, jsonb_build_object('title', t.title, 'assignee', t.assignee_id), app_now());
  return t;
end
$$;

create or replace function decide_approval(p_approval uuid, p_state approval_state) returns approvals
language plpgsql security definer
set search_path = public
as $$
declare
  actor uuid := require_actor();
  a approvals;
begin
  if current_app_role() is distinct from 'director' then
    raise exception 'Only directors can decide approvals' using errcode = 'insufficient_privilege';
  end if;
  select * into a from approvals where id = p_approval for update;
  if not found then
    raise exception 'Approval not found' using errcode = 'no_data_found';
  end if;
  if a.state = p_state then
    return a;
  end if;

  update approvals
  set state = p_state,
      decided_by = case when p_state = 'waiting' then null else actor end,
      decided_at = case when p_state = 'waiting' then null else app_now() end
  where id = p_approval
  returning * into a;

  insert into activity_log (actor_id, action, entity_type, entity_id, details, created_at)
  values (actor,
          case p_state when 'approved' then 'approve' when 'declined' then 'decline' else 'undo_decision' end::activity_action,
          'approval', a.id, jsonb_build_object('title', a.title), app_now());
  return a;
end
$$;

-- ------------------------------------------------------------------
-- Read views
-- ------------------------------------------------------------------

-- A short label for a task's linked record. Runs as the owner: a task the
-- viewer can see may link to a record in another department (a Finance task
-- about a shipment), and its number or name is shown even though the record
-- itself is not.
create function record_label(p_type linked_type, p_id uuid) returns text
language sql stable security definer
set search_path = public
as $$
  select case p_type
    when 'deal' then (select 'Deal · ' || cu.name from deals d join customers cu on cu.id = d.customer_id where d.id = p_id)
    when 'invoice' then (select number from invoices where id = p_id)
    when 'bill' then (select coalesce(reference, description) from bills where id = p_id)
    when 'shipment' then (select code from shipments where id = p_id)
    when 'product' then (select sku from products where id = p_id)
    when 'approval' then (select 'Approval · ' || title from approvals where id = p_id)
    when 'campaign' then (select name from campaigns where id = p_id)
    when 'order' then (select number from sales_orders where id = p_id)
  end
$$;

create or replace view task_list with (security_invoker = true) as
select
  t.id, t.title, t.status, t.due_date, t.done_at, t.created_at,
  a.slug as assignee_slug,
  c.slug as created_by_slug,
  f.slug as delegated_from_slug,
  t.linked_type, t.linked_id,
  record_label(t.linked_type, t.linked_id) as linked_label
from tasks t
join employees a on a.id = t.assignee_id
left join employees c on c.id = t.created_by
left join employees f on f.id = t.delegated_from_id;

-- The signed-in viewer: no row when the account has no access.
create view me with (security_invoker = true) as
select slug, access, department_id
from employees
where id = current_actor();

-- ------------------------------------------------------------------
-- Row-level security: read policies for signed-in managers and directors.
-- There are still no write policies; changes go through the functions above.
-- ------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'app_settings', 'departments', 'employees', 'customers', 'deals', 'sales_activities', 'campaigns',
    'marketing_calendar', 'invoices', 'warehouse_zones', 'products', 'shipments', 'shipment_items',
    'shipment_paperwork', 'bills', 'sales_orders', 'stock_movements', 'approvals', 'goals',
    'company_figures', 'tasks', 'activity_log'
  ] loop
    execute format('drop policy "read sample data" on %I', t);
  end loop;

  -- Open to every signed-in manager and director.
  foreach t in array array['app_settings', 'departments', 'employees', 'customers', 'goals'] loop
    execute format(
      'create policy "signed-in managers read" on %I for select to authenticated using ((select current_actor()) is not null)', t);
  end loop;
end
$$;

-- Each department's records: [table, departments that see it].
do $$
declare
  r record;
begin
  for r in select * from (values
    ('deals', array['sales']),
    ('sales_activities', array['sales']),
    ('sales_orders', array['sales', 'warehouse']),
    ('campaigns', array['marketing']),
    ('marketing_calendar', array['marketing']),
    ('invoices', array['finance']),
    ('bills', array['finance']),
    ('shipments', array['import-export', 'warehouse']),
    ('shipment_items', array['import-export', 'warehouse']),
    ('shipment_paperwork', array['import-export', 'warehouse']),
    ('products', array['warehouse', 'import-export']),
    ('warehouse_zones', array['warehouse', 'import-export']),
    ('stock_movements', array['warehouse', 'import-export'])
  ) as v(tbl, depts) loop
    execute format(
      'create policy "department reads" on %I for select to authenticated using ((select visible_departments()) && %L::text[])',
      r.tbl, r.depts);
  end loop;
end
$$;

-- Figures from other systems belong to the department that reports them.
create function figure_departments(p_key text) returns text[]
language sql immutable
as $$
  select case
    when p_key in ('cash_balance', 'revenue') then array['finance']
    when p_key = 'gross_margin_pct' then array['management']
    when p_key in ('marketing_budget', 'lead_conversion_pct') then array['marketing']
    else array['warehouse', 'import-export']
  end
$$;

create policy "department reads" on company_figures for select to authenticated
  using ((select visible_departments()) && figure_departments(key));

-- Management sees the approval queue; a department sees its own requests.
create policy "management and requester read" on approvals for select to authenticated
  using ((select visible_departments()) && array['management', requested_by_department]);

-- Tasks of people in the departments the viewer can see.
create policy "department reads" on tasks for select to authenticated
  using (exists (
    select 1 from employees e
    where e.id = tasks.assignee_id and e.department_id = any((select visible_departments())::text[])
  ));

-- Activity about tasks and approvals the viewer can see (their own policies apply).
create policy "follows its record" on activity_log for select to authenticated
  using (
    case entity_type
      when 'task' then exists (select 1 from tasks where tasks.id = activity_log.entity_id)
      when 'approval' then exists (select 1 from approvals where approvals.id = activity_log.entity_id)
      else false
    end
  );
