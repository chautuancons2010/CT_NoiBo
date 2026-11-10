-- Preserve historical records; serialize new daily captures across devices.
create or replace function public.guard_daily_attendance_capture()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.employee_id::text || ':' || new.attendance_date::text, 0));
  if exists(select 1 from public.attendance_events where client_event_id=new.client_event_id and employee_id=new.employee_id) then return new; end if;
  if exists(select 1 from public.employees e join public.employment_types t on t.id=e.employment_type_id where e.id=new.employee_id and t.worker_category='office') then
    raise exception using errcode='42501', message='OFFICE_ATTENDANCE_PAUSED';
  end if;
  if new.attendance_status='rejected' then return new; end if;
  if exists(select 1 from public.attendance_events where employee_id=new.employee_id and attendance_date=new.attendance_date and event_type=new.event_type and attendance_status<>'rejected') then
    raise exception using errcode='23505', message='ATTENDANCE_ALREADY_RECORDED';
  end if;
  if new.event_type='check_out' and not exists(select 1 from public.attendance_events where employee_id=new.employee_id and attendance_date=new.attendance_date and event_type='check_in' and attendance_status<>'rejected' and effective_at<=new.effective_at) then
    raise exception using errcode='23514', message='CHECK_IN_REQUIRED';
  end if;
  return new;
end $$;
drop trigger if exists attendance_daily_capture_guard on public.attendance_events;
create trigger attendance_daily_capture_guard before insert on public.attendance_events for each row execute function public.guard_daily_attendance_capture();
revoke all on function public.guard_daily_attendance_capture() from public,anon,authenticated;
