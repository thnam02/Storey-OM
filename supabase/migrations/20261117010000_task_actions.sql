-- Storey: task actions and the activity log (build order step 5).
--
-- Every change a manager makes goes through one of the functions below,
-- which writes the change and its activity log entry in one transaction.
-- Tables have no write policies, so these functions are the only way in.
--
-- Until sign-in exists (step 6), the database is open only while it holds
-- sample data (app_settings.dataset = 'sample'): anyone with the API key can
-- read it, and changes are made as the sample viewer. With any other dataset
-- nothing can be read or changed until step 6 adds roles.

-- ------------------------------------------------------------------
-- Settings, identity and time
-- ------------------------------------------------------------------

alter table app_settings drop constraint app_settings_key_check;
alter table app_settings add constraint app_settings_key_check
  check (key in ('dataset', 'today', 'timezone', 'currency', 'viewer'));

-- Order people are listed in (and seated by), so layouts stay put.
alter table employees add column list_order integer;
create index employees_list_order_idx on employees (list_order);

-- Settings are not sensitive; reading them must not depend on row-level security.
alter function app_timezone() security definer;
alter function app_today() security definer;

create function is_sample_mode() returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select value from app_settings where key = 'dataset'), 'live') = 'sample'
$$;

-- "Now" on the app's day: the current time of day on the pinned sample date,
-- so things done today count as done this week in the sample.
create function app_now() returns timestamptz
language sql stable security definer
set search_path = public
as $$
  select (app_today() + (now() at time zone app_timezone())::time) at time zone app_timezone()
$$;

-- The employee making changes. Sample mode: the sample viewer.
-- Step 6 replaces this with the employee linked to the signed-in user.
create function current_actor() returns uuid
language sql stable security definer
set search_path = public
as $$
  select e.id
  from employees e
  where is_sample_mode()
    and e.slug = (select value from app_settings where key = 'viewer')
$$;

create function require_actor() returns uuid
language plpgsql stable security definer
set search_path = public
as $$
declare
  actor uuid := current_actor();
begin
  if actor is null then
    raise exception 'Sign in to make changes' using errcode = 'insufficient_privilege';
  end if;
  return actor;
end
$$;

-- ------------------------------------------------------------------
-- Task actions
-- ------------------------------------------------------------------

create function assign_task(
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
  insert into tasks (title, status, due_date, assignee_id, created_by, linked_type, linked_id, created_at)
  values (btrim(p_title), 'todo', p_due, p_assignee, actor, p_linked_type, p_linked_id, app_now())
  returning * into t;

  insert into activity_log (actor_id, action, entity_type, entity_id, details, created_at)
  values (actor, 'assign', 'task', t.id, jsonb_build_object('title', t.title, 'assignee', t.assignee_id), app_now());
  return t;
end
$$;

-- Hand an open task to a teammate. It restarts as to do and remembers who had it.
create function delegate_task(p_task uuid, p_to uuid) returns tasks
language plpgsql security definer
set search_path = public
as $$
declare
  actor uuid := require_actor();
  t tasks;
  from_id uuid;
begin
  select * into t from tasks where id = p_task for update;
  if not found then
    raise exception 'Task not found' using errcode = 'no_data_found';
  end if;
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

create function complete_task(p_task uuid) returns tasks
language plpgsql security definer
set search_path = public
as $$
declare
  actor uuid := require_actor();
  t tasks;
begin
  select * into t from tasks where id = p_task for update;
  if not found then
    raise exception 'Task not found' using errcode = 'no_data_found';
  end if;
  if t.status = 'done' then
    return t;
  end if;

  update tasks set status = 'done', done_at = app_now() where id = p_task returning * into t;

  insert into activity_log (actor_id, action, entity_type, entity_id, details, created_at)
  values (actor, 'complete', 'task', t.id, jsonb_build_object('title', t.title, 'assignee', t.assignee_id), app_now());
  return t;
end
$$;

create function reopen_task(p_task uuid) returns tasks
language plpgsql security definer
set search_path = public
as $$
declare
  actor uuid := require_actor();
  t tasks;
begin
  select * into t from tasks where id = p_task for update;
  if not found then
    raise exception 'Task not found' using errcode = 'no_data_found';
  end if;
  if t.status <> 'done' then
    return t;
  end if;

  update tasks set status = 'todo', done_at = null where id = p_task returning * into t;

  insert into activity_log (actor_id, action, entity_type, entity_id, details, created_at)
  values (actor, 'reopen', 'task', t.id, jsonb_build_object('title', t.title, 'assignee', t.assignee_id), app_now());
  return t;
end
$$;

-- ------------------------------------------------------------------
-- Approvals
-- ------------------------------------------------------------------

-- Approve, decline, or put back in the queue ('waiting' undoes a decision).
create function decide_approval(p_approval uuid, p_state approval_state) returns approvals
language plpgsql security definer
set search_path = public
as $$
declare
  actor uuid := require_actor();
  a approvals;
begin
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
-- Read views for the app (security_invoker: row-level security applies)
-- ------------------------------------------------------------------

-- Tasks with people as slugs and a readable label for the linked record.
create view task_list with (security_invoker = true) as
select
  t.id, t.title, t.status, t.due_date, t.done_at, t.created_at,
  a.slug as assignee_slug,
  c.slug as created_by_slug,
  f.slug as delegated_from_slug,
  t.linked_type, t.linked_id,
  case t.linked_type
    when 'deal' then (select 'Deal · ' || cu.name from deals d join customers cu on cu.id = d.customer_id where d.id = t.linked_id)
    when 'invoice' then (select number from invoices where id = t.linked_id)
    when 'bill' then (select coalesce(reference, description) from bills where id = t.linked_id)
    when 'shipment' then (select code from shipments where id = t.linked_id)
    when 'product' then (select sku from products where id = t.linked_id)
    when 'approval' then (select 'Approval · ' || title from approvals where id = t.linked_id)
    when 'campaign' then (select name from campaigns where id = t.linked_id)
    when 'order' then (select number from sales_orders where id = t.linked_id)
  end as linked_label
from tasks t
join employees a on a.id = t.assignee_id
left join employees c on c.id = t.created_by
left join employees f on f.id = t.delegated_from_id;

create view deal_list with (security_invoker = true) as
select d.*, c.name as customer_name, o.name as owner_name
from deals d
join customers c on c.id = d.customer_id
left join employees o on o.id = d.owner_id;

create view sales_activity_list with (security_invoker = true) as
select s.*, c.name as customer_name, o.name as owner_name
from sales_activities s
join customers c on c.id = s.customer_id
left join employees o on o.id = s.owner_id;

create view shipment_list with (security_invoker = true) as
select s.*,
  coalesce((select array_agg(p.sku order by p.sku) from shipment_items i join products p on p.id = i.product_id where i.shipment_id = s.id), '{}') as skus
from shipments s;

create view paperwork_list with (security_invoker = true) as
select w.*, s.code as shipment_code
from shipment_paperwork w
join shipments s on s.id = w.shipment_id;

-- Activity with people as slugs (details hold employee ids for assignee, from, to).
create view activity_feed with (security_invoker = true) as
select
  l.id, l.created_at, l.action, l.entity_type, l.entity_id,
  a.slug as actor_slug,
  l.details ->> 'title' as title,
  (select slug from employees where id = (l.details ->> 'assignee')::uuid) as assignee_slug,
  (select slug from employees where id = (l.details ->> 'from')::uuid) as from_slug,
  (select slug from employees where id = (l.details ->> 'to')::uuid) as to_slug
from activity_log l
left join employees a on a.id = l.actor_id;

-- ------------------------------------------------------------------
-- Read access in sample mode (step 6 replaces these with role-based rules)
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
    execute format('create policy "read sample data" on %I for select to public using (is_sample_mode())', t);
  end loop;
end
$$;
