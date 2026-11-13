-- Publish invalidations only; work records remain behind scoped server APIs.
create trigger worker_work_events_realtime_invalidation
after insert on public.worker_work_events for each row
execute function public.enqueue_realtime_invalidation('worker-attendance','worker_attendance.view_project','');

create trigger worker_work_events_timesheet_invalidation
after insert on public.worker_work_events for each row
execute function public.enqueue_realtime_invalidation('timesheets','timesheet.view','');
