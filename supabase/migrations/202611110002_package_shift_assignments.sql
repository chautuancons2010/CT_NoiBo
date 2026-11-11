-- Validate polymorphic project references and prevent ambiguous package schedules.
create or replace function public.guard_package_shift_assignment()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.scope_type <> 'project' then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('package-shift:' || new.scope_id::text, 0));
  if not exists(select 1 from public.projects where id=new.scope_id) then
    raise exception using errcode='23503',message='PROJECT_NOT_FOUND';
  end if;
  if new.active and exists(select 1 from public.shift_assignments a where a.id<>new.id and a.active
    and a.scope_type='project' and a.scope_id=new.scope_id and a.weekdays && new.weekdays
    and a.effective_from<=coalesce(new.effective_to,'infinity'::date)
    and new.effective_from<=coalesce(a.effective_to,'infinity'::date)) then
    raise exception using errcode='23514',message='SHIFT_ASSIGNMENT_OVERLAP';
  end if;
  return new;
end $$;
create trigger package_shift_assignment_guard before insert or update on public.shift_assignments
for each row execute function public.guard_package_shift_assignment();
revoke all on function public.guard_package_shift_assignment() from public,anon,authenticated;
