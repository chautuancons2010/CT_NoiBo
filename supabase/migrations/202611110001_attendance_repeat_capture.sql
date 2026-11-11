-- Multiple daily pairs, serialized across devices; client IDs still make retries idempotent.
create or replace function public.guard_daily_attendance_capture()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare previous_type text;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.employee_id::text || ':' || new.attendance_date::text, 0));
  if exists(select 1 from public.attendance_events where client_event_id=new.client_event_id and employee_id=new.employee_id) then return new; end if;
  if exists(select 1 from public.employees e join public.employment_types t on t.id=e.employment_type_id where e.id=new.employee_id and t.worker_category='office') then
    raise exception using errcode='42501', message='OFFICE_ATTENDANCE_PAUSED';
  end if;
  if new.attendance_status='rejected' then return new; end if;
  select event_type into previous_type from public.attendance_events
    where employee_id=new.employee_id and attendance_date=new.attendance_date and attendance_status<>'rejected'
    order by effective_at desc, created_at desc limit 1;
  if previous_type=new.event_type then
    raise exception using errcode='23505', message='ATTENDANCE_ALREADY_RECORDED';
  end if;
  if new.event_type='check_out' and previous_type is distinct from 'check_in' then
    raise exception using errcode='23514', message='CHECK_IN_REQUIRED';
  end if;
  return new;
end $$;
revoke all on function public.guard_daily_attendance_capture() from public,anon,authenticated;
