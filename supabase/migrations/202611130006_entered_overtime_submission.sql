-- Entered overtime uses verified worker clocks instead of rerunning the normal
-- attendance checklist/photo wizard. Preserve the existing checks for that wizard.
create or replace function public.validate_worker_selection_submit()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_minimum_photos integer;
begin
 if not new.selection_mode or new.submitted_at is null or old.submitted_at is not null then return new;end if;
 if new.session_type='overtime' and new.overtime_recording_mode='time_entry' then
  if new.overtime_time_entry is null or not new.overtime_consent_confirmed
   or not exists(select 1 from worker_attendance_entries where session_id=new.id and is_selected)
   or exists(select 1 from worker_attendance_entries where session_id=new.id and is_selected and (status<>'present' or checked_in_at is null or checked_out_at is null or checked_out_at<=checked_in_at)) then raise exception 'OVERTIME_TIME_ENTRY_INVALID';end if;
  return new;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('worker-attendance:'||new.attendance_date::text||':'||new.shift_code,0));
 if not exists(select 1 from worker_attendance_entries where session_id=new.id and is_selected and status in ('present','late')) then raise exception 'FIELD_SELECTION_REQUIRED';end if;
 if exists(select 1 from worker_attendance_entries where session_id=new.id and is_selected and status not in ('present','late')) then raise exception 'FIELD_SELECTION_INVALID';end if;
 if not new.safety_confirmed then raise exception 'FIELD_SAFETY_REQUIRED';end if;
 select greatest(1,new.minimum_photos_snapshot,coalesce(minimum_photos,0)) into v_minimum_photos from worker_attendance_policies where active limit 1;
 if (select count(*) from worker_attendance_photos where session_id=new.id)<coalesce(v_minimum_photos,1) then raise exception 'FIELD_PHOTO_REQUIRED';end if;
 if exists(select 1 from worker_attendance_entries chosen
  join worker_attendance_entries other on other.worker_id=chosen.worker_id and other.session_id<>new.id
  join worker_attendance_sessions s on s.id=other.session_id
  where chosen.session_id=new.id and chosen.is_selected and other.is_selected and other.status in ('present','late')
  and s.attendance_date=new.attendance_date and s.shift_code=new.shift_code and s.session_type=new.session_type
  and (s.project_id<>new.project_id or s.worksite_id<>new.worksite_id)
  and s.submitted_at is not null and s.status in ('submitted','locked','needs_review')) then raise exception 'FIELD_WORKER_ALREADY_RECORDED';end if;
 return new;
end $$;
revoke all on function public.validate_worker_selection_submit() from public,anon,authenticated;
notify pgrst,'reload schema';
