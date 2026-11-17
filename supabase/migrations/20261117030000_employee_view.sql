-- Storey: the employee view (build order step 7).
--
-- Everyone else in the company can now sign in as an employee and use
-- "My desk": their own tasks, which they can mark done, reopen, and add to
-- (a to-do for themselves). They see the staff directory, departments,
-- customers and company goals like managers do, but no one else's tasks
-- and no department's records. Delegation and approvals stay with
-- managers and directors.
--
-- The new enum value can't be used in the transaction that adds it, so the
-- functions below test for manager and director rather than for employee.

alter type app_role add value 'employee';

-- Employees see no department's records: an empty list, not null.
create or replace function visible_departments() returns text[]
language sql stable security definer
set search_path = public
as $$
  select case e.access
    when 'director' then array(select id from departments order by id)
    when 'manager' then array[e.department_id]
    else '{}'::text[]
  end
  from employees e
  where e.id = current_actor()
$$;

-- Whether the signed-in person manages others (a manager or a director).
create function is_manager_or_director() returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(current_app_role() in ('manager', 'director'), false)
$$;

-- Everyone can change their own tasks; managers and directors also those in
-- the departments they see.
create or replace function require_task_access(p_task uuid) returns uuid
language plpgsql stable security definer
set search_path = public
as $$
declare
  actor uuid := require_actor();
  t tasks;
  dept text;
begin
  select * into t from tasks where id = p_task;
  if not found then
    raise exception 'Task not found' using errcode = 'no_data_found';
  end if;
  if t.assignee_id = actor then
    return actor;
  end if;
  if not is_manager_or_director() then
    raise exception 'You can only change your own tasks' using errcode = 'insufficient_privilege';
  end if;
  select department_id into dept from employees where id = t.assignee_id;
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
  if p_assignee <> actor then
    if not is_manager_or_director() then
      raise exception 'You can only add tasks for yourself' using errcode = 'insufficient_privilege';
    end if;
    perform require_department((select department_id from employees where id = p_assignee));
  end if;

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
  actor uuid := require_actor();
  t tasks;
  from_id uuid;
begin
  if not is_manager_or_director() then
    raise exception 'Only managers can delegate tasks' using errcode = 'insufficient_privilege';
  end if;
  perform require_task_access(p_task);
  select * into t from tasks where id = p_task for update;
  if t.status = 'done' then
    raise exception 'Only open tasks can be delegated' using errcode = 'check_violation';
  end if;
  if t.assignee_id = p_to then
    raise exception 'The task is already with that person' using errcode = 'check_violation';
  end if;
  -- A manager delegating their own task still needs the target in their department.
  perform require_department((select department_id from employees where id = t.assignee_id));
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

-- Everyone sees their own tasks (and, through them, the activity about them).
create policy "own tasks" on tasks for select to authenticated
  using (assignee_id = (select current_actor()));
