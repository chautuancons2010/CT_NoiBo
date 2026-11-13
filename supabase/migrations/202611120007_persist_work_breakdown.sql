-- Keep the existing atomic computation/version/lock checks and persist the
-- additional work breakdown in the same transaction.
alter function public.save_timesheet_computation(uuid,integer,uuid,jsonb,jsonb,jsonb)
rename to save_timesheet_computation_before_work_breakdown;

create function public.save_timesheet_computation(p_period_id uuid,p_row_version integer,p_actor_id uuid,p_daily jsonb,p_exceptions jsonb,p_summaries jsonb)
returns void language plpgsql security invoker set search_path=public as $$
begin
 perform public.save_timesheet_computation_before_work_breakdown(p_period_id,p_row_version,p_actor_id,p_daily,p_exceptions,p_summaries);
 update public.daily_timesheets d set
  outside_minutes=coalesce((j->>'outside_minutes')::integer,0),
  overtime_minutes=coalesce((j->>'overtime_minutes')::integer,0),
  pending_overtime_minutes=coalesce((j->>'pending_overtime_minutes')::integer,0),
  arrival_late_minutes=coalesce((j->>'arrival_late_minutes')::integer,0),
  rain_pause_minutes=coalesce((j->>'rain_pause_minutes')::integer,0)
 from jsonb_array_elements(p_daily) j
 where d.period_id=p_period_id and d.employee_id=(j->>'employee_id')::uuid and d.work_date=(j->>'work_date')::date;
 update public.timesheet_period_summaries s set
  overtime_minutes=coalesce((j->>'overtime_minutes')::integer,0),
  pending_overtime_minutes=coalesce((j->>'pending_overtime_minutes')::integer,0),
  rain_pause_minutes=coalesce((j->>'rain_pause_minutes')::integer,0)
 from jsonb_array_elements(p_summaries) j
 where s.period_id=p_period_id and s.employee_id=(j->>'employee_id')::uuid;
end $$;
revoke all on function public.save_timesheet_computation(uuid,integer,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_timesheet_computation(uuid,integer,uuid,jsonb,jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
