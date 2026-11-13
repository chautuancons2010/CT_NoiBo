-- Preserve each client observation time across offline synchronization.
create or replace function public.capture_worker_selection_clock()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_session worker_attendance_sessions%rowtype; v_observed timestamptz; v_deadline timestamptz;
begin
  select * into v_session from worker_attendance_sessions where id=new.session_id;
  if v_session.submitted_at is not null then return new; end if;
  if new.is_selected and new.status in ('present','late') then
    if old.is_selected and old.status in ('present','late') and old.checked_in_at is not null then
      new.checked_in_at:=old.checked_in_at;
    else
      v_observed:=coalesce(new.checked_in_at,v_session.captured_at_client);
      if v_observed is null or (v_observed at time zone 'Asia/Ho_Chi_Minh')::date<>v_session.attendance_date
        or v_observed>now()+interval '5 minutes' or v_observed<now()-interval '45 days' then
        raise exception 'FIELD_CLOCK_ORDER';
      end if;
      new.checked_in_at:=v_observed;
    end if;
    if v_session.attendance_date>='2026-11-12' and v_session.session_type<>'overtime' and v_session.shift_start_snapshot is not null then
      v_deadline:=((v_session.attendance_date+v_session.shift_start_snapshot) at time zone 'Asia/Ho_Chi_Minh')-interval '10 minutes';
      if new.checked_in_at>v_deadline then new.status:='late'; end if;
    end if;
  else
    new.checked_in_at:=null;new.checked_out_at:=null;
  end if;
  return new;
end $$;
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
      checked_in_at=coalesce(nullif(v_entry->>'checkedInAt','')::timestamptz,checked_in_at),
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

