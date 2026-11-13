-- Merge the two work groups; retain the legacy row for historical references.
do $$
declare
  canonical_id uuid;
  legacy_id uuid;
begin
  select id into canonical_id from public.employment_types where code = 'supervisor';
  select id into legacy_id from public.employment_types where code = 'engineer';
  if canonical_id is null and legacy_id is not null then
    update public.employment_types set code = 'supervisor', name = 'Giám sát', worker_category = 'supervisor', active = true, sort_order = 20 where id = legacy_id;
  elsif canonical_id is not null then
    update public.employment_types set name = 'Giám sát', worker_category = 'supervisor', active = true, sort_order = 20 where id = canonical_id;
    if legacy_id is not null then
      update public.employees set employment_type_id = canonical_id where employment_type_id = legacy_id;
      update public.employment_types set active = false where id = legacy_id;
    end if;
  end if;
end $$;
