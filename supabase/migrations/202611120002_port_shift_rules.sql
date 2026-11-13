-- Explicit lunch boundaries and arrival requirements, versioned with each shift.
alter table public.shifts add column if not exists schedule_rules jsonb not null default '{}'::jsonb;
alter table public.shift_versions add column if not exists schedule_rules jsonb not null default '{}'::jsonb;

create or replace function public.update_shift_with_attendance_rules(
  p_shift_id uuid, p_values jsonb, p_effective_from date, p_reason text, p_actor uuid
) returns public.shifts language plpgsql security definer set search_path=public as $$
declare result public.shifts;
begin
  result := public.update_shift_with_version(p_shift_id,p_values,p_effective_from,p_reason,p_actor);
  update public.shifts set schedule_rules=coalesce(p_values->'schedule_rules','{}'::jsonb) where id=p_shift_id returning * into result;
  update public.shift_versions set schedule_rules=result.schedule_rules where shift_id=p_shift_id and effective_from=p_effective_from;
  return result;
end; $$;
revoke all on function public.update_shift_with_attendance_rules(uuid,jsonb,date,text,uuid) from public;
grant execute on function public.update_shift_with_attendance_rules(uuid,jsonb,date,text,uuid) to service_role;

insert into public.shifts(code,name,start_time,end_time,break_minutes,late_grace_minutes,early_leave_grace_minutes,check_in_earliest_minutes,check_in_latest_minutes,check_out_earliest_minutes,check_out_latest_minutes,cross_midnight,active,schedule_rules)
values
 ('PORT_SPECIALIZED','Cảng chuyên dụng','08:00','17:00',90,0,0,120,240,0,360,false,true,'{"breakStartTime":"11:30","breakEndTime":"13:00","arrivalLeadMinutes":15}'),
 ('PORT_GENERAL','Cảng tổng hợp','07:30','17:00',90,0,0,120,240,0,360,false,true,'{"breakStartTime":"11:30","breakEndTime":"13:00","arrivalLeadMinutes":15}')
on conflict do nothing;
insert into public.shift_versions(shift_id,version,code,name,start_time,end_time,break_minutes,late_grace_minutes,early_leave_grace_minutes,cross_midnight,effective_from,reason,schedule_rules)
select s.id,1,s.code,s.name,s.start_time,s.end_time,s.break_minutes,s.late_grace_minutes,s.early_leave_grace_minutes,s.cross_midnight,'2026-11-13','Công văn 1111/2026/TBQĐ-CT',s.schedule_rules
from public.shifts s where s.code in ('PORT_SPECIALIZED','PORT_GENERAL') and not exists(select 1 from public.shift_versions v where v.shift_id=s.id);
