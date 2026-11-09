-- Per-person observation times; no invented timestamps for historical sessions.
alter table public.worker_attendance_entries
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_out_at timestamptz;
alter table public.worker_attendance_sessions
  add column if not exists shift_start_snapshot time,
  add column if not exists shift_end_snapshot time,
  add column if not exists shift_break_minutes_snapshot integer not null default 0 check (shift_break_minutes_snapshot >= 0);

create or replace function public.capture_worker_selection_clock()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_session worker_attendance_sessions%rowtype;
begin
  select * into v_session from worker_attendance_sessions where id=new.session_id;
  if v_session.submitted_at is not null then return new; end if;
  if new.is_selected and new.status in ('present','late') then
    if (not old.is_selected or old.status not in ('present','late')) and v_session.attendance_date=(now() at time zone 'Asia/Ho_Chi_Minh')::date then
      new.checked_in_at:=clock_timestamp();
    end if;
  else
    new.checked_in_at:=null; new.checked_out_at:=null;
  end if;
  return new;
end $$;
create trigger capture_worker_selection_clock before update of is_selected,status on public.worker_attendance_entries
  for each row execute function public.capture_worker_selection_clock();

create or replace function public.close_worker_selection_clocks()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_entry worker_attendance_entries%rowtype; v_out timestamptz; v_date date;
begin
  if new.day_closed_at is null or old.day_closed_at is not null then return new; end if;
  for v_entry in select * from worker_attendance_entries where session_id=new.id and is_selected and status in ('present','late') for update loop
    v_date:=new.attendance_date;
    if v_entry.exception_time is not null then
      if new.shift_end_snapshot<=new.shift_start_snapshot and v_entry.exception_time<new.shift_start_snapshot then v_date:=v_date+1;end if;
      v_out:=(v_date+v_entry.exception_time) at time zone 'Asia/Ho_Chi_Minh';
    else v_out:=new.day_closed_at; end if;
    if v_entry.checked_in_at is not null and v_out<v_entry.checked_in_at then raise exception 'FIELD_CLOCK_ORDER';end if;
    update worker_attendance_entries set checked_out_at=v_out where id=v_entry.id;
  end loop;
  return new;
end $$;
create trigger close_worker_selection_clocks after update of day_closed_at on public.worker_attendance_sessions
  for each row execute function public.close_worker_selection_clocks();

insert into public.role_permissions(role_id,permission_key)
select r.id,p.key from public.roles r cross join public.permissions p
where r.code='hr' and p.key=any(array['worker_attendance.view','worker_attendance.view_all','worker_attendance.view_project','worker_attendance.view_photo','worker_attendance.export'])
on conflict do nothing;

revoke all on function public.capture_worker_selection_clock() from public,anon,authenticated;
revoke all on function public.close_worker_selection_clocks() from public,anon,authenticated;
notify pgrst,'reload schema';
