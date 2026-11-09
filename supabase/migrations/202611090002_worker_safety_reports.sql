-- Preserve historical reports; new sessions carry an editable safety report.
alter table public.worker_attendance_sessions
  add column if not exists safety_report jsonb
  check (safety_report is null or jsonb_typeof(safety_report)='object');

create or replace function public.save_worker_session_draft_command(
  p_session_id uuid,p_expected_version integer,p_actor_id uuid,p_header jsonb,p_entries jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_session worker_attendance_sessions%rowtype;v_entry jsonb;v_response jsonb;
begin
  select * into v_session from worker_attendance_sessions where id=p_session_id for update;
  if not found then raise exception 'FIELD_SESSION_NOT_FOUND';end if;
  perform assert_worker_session_actor(p_session_id,p_actor_id,array['worker_attendance.create']);
  if p_expected_version is null or v_session.version<>p_expected_version then raise exception 'FIELD_VERSION_CONFLICT';end if;
  if v_session.submitted_at is not null or v_session.status in ('submitted','locked') then raise exception 'FIELD_SESSION_NOT_EDITABLE';end if;
  if p_entries is null or jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries)>500
    or p_header is null or jsonb_typeof(p_header)<>'object'
    or jsonb_typeof(p_header->'checklist_responses') is distinct from 'array'
    or jsonb_array_length(p_header->'checklist_responses')>100 then raise exception 'FIELD_INPUT_INVALID';end if;
  if p_header?'safety_report' and (jsonb_typeof(p_header->'safety_report') is distinct from 'object'
    or jsonb_typeof(p_header->'safety_report'->'briefing') is distinct from 'array'
    or jsonb_array_length(p_header->'safety_report'->'briefing') not between 1 and 20)
    then raise exception 'FIELD_INPUT_INVALID';end if;
  if (select count(*) from jsonb_array_elements(p_entries))<>(select count(distinct entry->>'id') from jsonb_array_elements(p_entries) entry) then raise exception 'FIELD_ENTRY_INVALID';end if;
  for v_response in select value from jsonb_array_elements(p_header->'checklist_responses') loop
    if not exists(select 1 from jsonb_array_elements(coalesce(v_session.checklist_snapshot,'[]'::jsonb)) item where item->>'id'=v_response->>'itemId') then raise exception 'FIELD_CHECKLIST_INVALID';end if;
  end loop;
  for v_entry in select value from jsonb_array_elements(p_entries) loop
    perform 1 from worker_attendance_entries where id=(v_entry->>'id')::uuid and session_id=p_session_id for update;
    if not found then raise exception 'FIELD_ENTRY_INVALID';end if;
    update worker_attendance_entries set status=(v_entry->>'status')::worker_attendance_entry_status,
      is_selected=case when v_session.selection_mode then coalesce((v_entry->>'isSelected')::boolean,is_selected) else true end,
      exception_reason=nullif(v_entry->>'exceptionReason','')::worker_exception_reason,
      day_exception=coalesce(v_entry->>'dayException','none')::worker_day_exception,
      exception_time=nullif(v_entry->>'exceptionTime','')::time,note=v_entry->>'note'
    where id=(v_entry->>'id')::uuid and session_id=p_session_id;
  end loop;
  update worker_attendance_sessions set work_note=p_header->>'work_note',note=p_header->>'note',
    safety_confirmed=coalesce((p_header->>'safety_confirmed')::boolean,safety_confirmed),
    safety_report=case when p_header?'safety_report' then p_header->'safety_report' else safety_report end,
    checklist_responses=p_header->'checklist_responses',status='in_progress',sync_status='synced',
    latitude=case when p_header?'latitude' then (p_header->>'latitude')::double precision else latitude end,
    longitude=case when p_header?'longitude' then (p_header->>'longitude')::double precision else longitude end,
    accuracy_meters=case when p_header?'accuracy_meters' then (p_header->>'accuracy_meters')::double precision else accuracy_meters end,
    geofence_status=case when p_header?'geofence_status' then p_header->>'geofence_status' else geofence_status end,
    distance_meters=case when p_header?'distance_meters' then (p_header->>'distance_meters')::double precision else distance_meters end
  where id=p_session_id;
  return p_session_id;
end $$;

create or replace function public.validate_worker_safety_report_submit()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_report jsonb;v_item jsonb;v_supervisors integer;
begin
  if not new.selection_mode or new.submitted_at is null or old.submitted_at is not null or new.safety_report is null then return new;end if;
  v_report:=new.safety_report;
  if jsonb_typeof(v_report->'briefing') is distinct from 'array' or jsonb_array_length(v_report->'briefing') not between 1 and 20
    then raise exception 'FIELD_SAFETY_REPORT_REQUIRED';end if;
  for v_item in select value from jsonb_array_elements(v_report->'briefing') loop
    if nullif(btrim(v_item->>'content'),'') is null or v_item->>'checked' is distinct from 'true' then raise exception 'FIELD_SAFETY_REPORT_REQUIRED';end if;
  end loop;
  begin v_supervisors:=(v_report->>'supervisorCount')::integer;exception when others then raise exception 'FIELD_SAFETY_REPORT_REQUIRED';end;
  if v_supervisors is null or v_supervisors not between 1 and 100
    or nullif(btrim(v_report->>'contractorName'),'') is null
    or nullif(btrim(v_report->>'healthStatus'),'') is null
    or nullif(btrim(v_report->>'workArea'),'') is null
    or nullif(btrim(new.work_note),'') is null then raise exception 'FIELD_SAFETY_REPORT_REQUIRED';end if;
  return new;
end $$;

create trigger worker_safety_report_submit_check before update of submitted_at on public.worker_attendance_sessions
  for each row execute function public.validate_worker_safety_report_submit();
revoke all on function public.save_worker_session_draft_command(uuid,integer,uuid,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.validate_worker_safety_report_submit() from public,anon,authenticated;
grant execute on function public.save_worker_session_draft_command(uuid,integer,uuid,jsonb,jsonb) to service_role;
