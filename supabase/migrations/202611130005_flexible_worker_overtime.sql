alter table public.worker_attendance_sessions
 add column if not exists overtime_recording_mode text check(overtime_recording_mode is null or overtime_recording_mode='time_entry'),
 add column if not exists overtime_time_entry jsonb;

-- Existing photo-based rounds keep their original evidence rule. Entered hours
-- are submitted only by the dedicated service-role command below.
create or replace function public.capture_overtime_evidence_clocks()
returns trigger language plpgsql security definer set search_path=public as $$
declare begin_at timestamptz; middle_at timestamptz; end_at timestamptz;
begin
 if new.session_type<>'overtime' or new.submitted_at is null or old.submitted_at is not null then return new; end if;
 if not new.overtime_consent_confirmed then raise exception 'OVERTIME_CONSENT_REQUIRED'; end if;
 if new.overtime_recording_mode='time_entry' then return new; end if;
 select min(captured_at) filter(where metadata->>'checkpoint'='start'),min(captured_at) filter(where metadata->>'checkpoint'='middle'),max(captured_at) filter(where metadata->>'checkpoint'='end') into begin_at,middle_at,end_at from worker_attendance_photos where session_id=new.id;
 if begin_at is null or middle_at is null or end_at is null or not(begin_at<middle_at and middle_at<end_at) then raise exception 'OVERTIME_THREE_CHECKPOINTS_REQUIRED'; end if;
 update worker_attendance_entries set checked_in_at=greatest(coalesce(checked_in_at,begin_at),begin_at),checked_out_at=least(coalesce(checked_out_at,end_at),end_at) where session_id=new.id and is_selected and status in ('present','late');
 update worker_attendance_entries e set checked_out_at=(select checked_out_at from worker_attendance_entries ot where ot.session_id=new.id and ot.worker_id=e.worker_id and ot.is_selected limit 1) from worker_attendance_sessions s
 where e.session_id=s.id and s.project_id=new.project_id and s.worksite_id=new.worksite_id and s.attendance_date=new.attendance_date and s.session_type<>'overtime'
 and e.is_selected and e.checked_in_at is not null and e.checked_in_at<=begin_at and e.checked_out_at is null
 and e.worker_id in(select worker_id from worker_attendance_entries where session_id=new.id and is_selected and status in ('present','late'));
 return new;
end; $$;
revoke all on function public.capture_overtime_evidence_clocks() from public,anon,authenticated;

create or replace function public.record_worker_overtime_time_entry(p_session uuid,p_actor uuid,p_input jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.worker_attendance_sessions; e public.worker_attendance_entries;
 v_start timestamptz;v_end timestamptz;v_pause timestamptz;v_resume timestamptz;v_workers uuid[];
begin
 perform public.assert_worker_session_actor(p_session,p_actor,array['worker_attendance.create']);
 select * into s from public.worker_attendance_sessions where id=p_session for update;
 if s.session_type<>'overtime' then raise exception 'OVERTIME_SESSION_REQUIRED';end if;
 if s.submitted_at is not null then
  if s.overtime_recording_mode='time_entry' and s.overtime_time_entry=p_input then return s.id;end if;
  raise exception 'OVERTIME_REPLAY_CONFLICT';
 end if;
 if s.status='locked' then raise exception 'FIELD_SESSION_LOCKED';end if;
 if p_input->>'ownerAccountId'<>p_actor::text or p_input->>'clientSessionId'<>s.client_session_id::text
 or p_input->>'projectId'<>s.project_id::text or p_input->>'worksiteId'<>s.worksite_id::text
 or p_input->>'date'<>s.attendance_date::text or p_input->>'shiftCode'<>s.shift_code
 or coalesce((p_input->>'consentConfirmed')::boolean,false)=false then raise exception 'OVERTIME_SCOPE';end if;
 v_start:=(p_input->>'checkedInAt')::timestamptz;v_end:=(p_input->>'checkedOutAt')::timestamptz;
 v_pause:=(p_input->>'breakStartedAt')::timestamptz;v_resume:=(p_input->>'breakEndedAt')::timestamptz;
 if v_start is null or v_end is null or v_end<=v_start or (v_start at time zone 'Asia/Ho_Chi_Minh')::date<>s.attendance_date then raise exception 'FIELD_CLOCK_ORDER';end if;
 if (v_pause is null)<>(v_resume is null) or v_pause is not null and not(v_start<=v_pause and v_pause<v_resume and v_resume<=v_end and v_resume-v_pause<v_end-v_start) then raise exception 'FIELD_CLOCK_ORDER';end if;
 select array_agg(value::uuid) into v_workers from jsonb_array_elements_text(p_input->'workerIds');
 if coalesce(cardinality(v_workers),0)=0 or cardinality(v_workers)<> (select count(distinct w) from unnest(v_workers) w)
 or (select count(*) from worker_attendance_entries where session_id=s.id and worker_id=any(v_workers))<>cardinality(v_workers) then raise exception 'FIELD_ENTRY_SCOPE';end if;
 if exists(select 1 from worker_work_events where session_id=s.id) then raise exception 'OVERTIME_WORK_EVENTS_EXIST';end if;
 update worker_attendance_entries set is_selected=worker_id=any(v_workers),status=case when worker_id=any(v_workers) then 'present'::worker_attendance_entry_status else 'unconfirmed'::worker_attendance_entry_status end,
 checked_in_at=case when worker_id=any(v_workers) then v_start else null end,checked_out_at=case when worker_id=any(v_workers) then v_end else null end,exception_reason=null,day_exception='none',exception_time=null where session_id=s.id;
 if v_pause is not null then
  for e in select * from worker_attendance_entries where session_id=s.id and is_selected loop
   insert into worker_work_events(batch_id,session_id,entry_id,event_type,effective_at,reason,created_by) values
    (gen_random_uuid(),s.id,e.id,'pause',v_pause,'overtime_break',p_actor),(gen_random_uuid(),s.id,e.id,'resume',v_resume,'overtime_break',p_actor);
  end loop;
 end if;
 update worker_attendance_sessions set overtime_recording_mode='time_entry',overtime_time_entry=p_input,
 overtime_consent_confirmed=true,overtime_status='pending',submitted_at=now(),status='submitted',sync_status='synced',photo_status='not_required',minimum_photos_snapshot=0,note=nullif(p_input->>'note','') where id=s.id;
 return s.id;
end; $$;
revoke all on function public.record_worker_overtime_time_entry(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.record_worker_overtime_time_entry(uuid,uuid,jsonb) to service_role;
notify pgrst,'reload schema';
