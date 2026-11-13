alter table public.daily_timesheets
 add column if not exists outside_minutes integer not null default 0 check(outside_minutes>=0),
 add column if not exists overtime_minutes integer not null default 0 check(overtime_minutes>=0),
 add column if not exists pending_overtime_minutes integer not null default 0 check(pending_overtime_minutes>=0),
 add column if not exists arrival_late_minutes integer not null default 0 check(arrival_late_minutes>=0),
 add column if not exists rain_pause_minutes integer not null default 0 check(rain_pause_minutes>=0);
alter table public.timesheet_period_summaries
 add column if not exists overtime_minutes integer not null default 0 check(overtime_minutes>=0),
 add column if not exists pending_overtime_minutes integer not null default 0 check(pending_overtime_minutes>=0),
 add column if not exists rain_pause_minutes integer not null default 0 check(rain_pause_minutes>=0);
notify pgrst,'reload schema';
