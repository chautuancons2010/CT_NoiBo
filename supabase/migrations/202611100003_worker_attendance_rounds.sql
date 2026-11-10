-- A session is an observation round, not the unique daily attendance record.
-- Keep client_session_id uniqueness for offline retries and session/worker uniqueness.
do $$
declare item record;
begin
  for item in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.worker_attendance_sessions'::regclass
      and c.contype = 'u'
      and (select array_agg(a.attname::text order by a.attname)
           from unnest(c.conkey) k(attnum)
           join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum)
        = array['attendance_date','project_id','session_type','shift_code','worksite_id']::text[]
  loop
    execute format('alter table public.worker_attendance_sessions drop constraint %I', item.conname);
  end loop;
end $$;

create index if not exists worker_attendance_rounds_idx
  on public.worker_attendance_sessions(supervisor_employee_id, worksite_id, attendance_date, shift_code, started_at desc);

notify pgrst, 'reload schema';
