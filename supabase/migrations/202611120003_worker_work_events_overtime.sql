alter table public.worker_attendance_sessions drop constraint if exists worker_attendance_sessions_session_type_check;
alter table public.worker_attendance_sessions add constraint worker_attendance_sessions_session_type_check check(session_type in ('morning','end_of_day','overtime'));
alter table public.worker_attendance_sessions
  add column if not exists shift_schedule_rules_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists overtime_status text check(overtime_status in ('recording','pending','confirmed','rejected')),
  add column if not exists overtime_day_type text check(overtime_day_type in ('working_day','rest_day','holiday')),
  add column if not exists overtime_consent_confirmed boolean not null default false,
  add column if not exists overtime_review_note text,
  add column if not exists overtime_reviewed_by uuid references public.app_accounts(id),
  add column if not exists overtime_reviewed_at timestamptz;

create table if not exists public.worker_work_events (
 id uuid primary key default gen_random_uuid(),
 batch_id uuid not null,
 session_id uuid not null references public.worker_attendance_sessions(id),
 entry_id uuid not null references public.worker_attendance_entries(id),
 event_type text not null check(event_type in ('start','pause','resume','finish')),
 effective_at timestamptz not null,
 reason text not null,
 created_by uuid not null references public.app_accounts(id),
 created_at timestamptz not null default now(),
 unique(batch_id,entry_id)
);
create index if not exists worker_work_events_entry_time on public.worker_work_events(entry_id,effective_at,id);
create index if not exists worker_work_events_session on public.worker_work_events(session_id);
alter table public.worker_work_events enable row level security;
revoke all on public.worker_work_events from public,anon,authenticated;
grant all on public.worker_work_events to service_role;

create or replace function public.record_worker_work_operation(p_session uuid,p_actor uuid,p_batch uuid,p_entries uuid[],p_event text,p_effective timestamptz,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare s public.worker_attendance_sessions; e public.worker_attendance_entries; last_event public.worker_work_events;
begin
 perform public.assert_worker_session_actor(p_session,p_actor,array['worker_attendance.create','worker_attendance.adjust']);
 select * into s from public.worker_attendance_sessions where id=p_session for update;
 if s.status='locked' then raise exception 'FIELD_SESSION_LOCKED'; end if;
 if p_event not in ('pause','resume','finish') or cardinality(p_entries)=0 or cardinality(p_entries)>500 or length(trim(p_reason))=0 then raise exception 'FIELD_WORK_OPERATION_INVALID'; end if;
 if p_effective>now()+interval '2 minutes' or p_effective<now()-interval '45 days' or (p_effective at time zone 'Asia/Ho_Chi_Minh')::date not between s.attendance_date and s.attendance_date+1 then raise exception 'FIELD_CLOCK_ORDER'; end if;
 if exists(select 1 from worker_work_events where batch_id=p_batch) then
   if (select count(*) from worker_work_events where batch_id=p_batch and session_id=p_session and created_by=p_actor and event_type=p_event and effective_at=p_effective and reason=p_reason and entry_id=any(p_entries))<>cardinality(p_entries) then raise exception 'FIELD_WORK_REPLAY_CONFLICT'; end if;
   return;
 end if;
 if (select count(*) from worker_attendance_entries where session_id=p_session and id=any(p_entries) and is_selected and status in ('present','late'))<>cardinality(p_entries) then raise exception 'FIELD_ENTRY_SCOPE'; end if;
 for e in select * from worker_attendance_entries where session_id=p_session and id=any(p_entries) for update loop
   select * into last_event from worker_work_events where entry_id=e.id order by effective_at desc,created_at desc limit 1;
   if e.checked_in_at is null or e.checked_out_at is not null or p_effective<greatest(e.checked_in_at,coalesce(last_event.effective_at,e.checked_in_at)) then raise exception 'FIELD_CLOCK_ORDER'; end if;
   if p_event='pause' and last_event.event_type='pause' or p_event='resume' and coalesce(last_event.event_type,'start')<>'pause' then raise exception 'FIELD_WORK_STATE_CONFLICT'; end if;
   insert into worker_work_events(batch_id,session_id,entry_id,event_type,effective_at,reason,created_by) values(p_batch,p_session,e.id,p_event,p_effective,p_reason,p_actor);
   if p_event='finish' then update worker_attendance_entries set checked_out_at=p_effective where id=e.id; end if;
 end loop;
end; $$;
revoke all on function public.record_worker_work_operation(uuid,uuid,uuid,uuid[],text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.record_worker_work_operation(uuid,uuid,uuid,uuid[],text,timestamptz,text) to service_role;

create or replace function public.capture_overtime_evidence_clocks()
returns trigger language plpgsql security definer set search_path=public as $$
declare begin_at timestamptz; middle_at timestamptz; end_at timestamptz;
begin
 if new.session_type<>'overtime' or new.submitted_at is null or old.submitted_at is not null then return new; end if;
 if not new.overtime_consent_confirmed then raise exception 'OVERTIME_CONSENT_REQUIRED'; end if;
 select min(captured_at) filter(where metadata->>'checkpoint'='start'),min(captured_at) filter(where metadata->>'checkpoint'='middle'),max(captured_at) filter(where metadata->>'checkpoint'='end') into begin_at,middle_at,end_at from worker_attendance_photos where session_id=new.id;
 if begin_at is null or middle_at is null or end_at is null or not(begin_at<middle_at and middle_at<end_at) then raise exception 'OVERTIME_THREE_CHECKPOINTS_REQUIRED'; end if;
 update worker_attendance_entries set checked_in_at=greatest(coalesce(checked_in_at,begin_at),begin_at),checked_out_at=least(coalesce(checked_out_at,end_at),end_at) where session_id=new.id and is_selected and status in ('present','late');
 -- Finishing overtime closes the continuing selected workers at their actual end.
 update worker_attendance_entries e set checked_out_at=(select checked_out_at from worker_attendance_entries ot where ot.session_id=new.id and ot.worker_id=e.worker_id and ot.is_selected limit 1) from worker_attendance_sessions s
 where e.session_id=s.id and s.project_id=new.project_id and s.worksite_id=new.worksite_id and s.attendance_date=new.attendance_date and s.session_type<>'overtime'
 and e.is_selected and e.checked_in_at is not null and e.checked_in_at<=begin_at and e.checked_out_at is null
 and e.worker_id in(select worker_id from worker_attendance_entries where session_id=new.id and is_selected and status in ('present','late'));
 return new;
end; $$;
create trigger overtime_evidence_clocks after update of submitted_at on public.worker_attendance_sessions for each row execute function public.capture_overtime_evidence_clocks();
revoke all on function public.capture_overtime_evidence_clocks() from public,anon,authenticated;
create or replace function public.close_worker_selection_clocks()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_entry worker_attendance_entries%rowtype; v_out timestamptz; v_date date;
begin
  if new.day_closed_at is null or old.day_closed_at is not null then return new; end if;
  for v_entry in select * from worker_attendance_entries where session_id=new.id and is_selected and status in ('present','late') for update loop
    if v_entry.checked_out_at is not null then continue; end if;
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
notify pgrst,'reload schema';
