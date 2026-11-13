-- Admin authority also applies inside transaction RPCs, independently of a
-- partially saved role-permission list. Inactive accounts remain denied.
create or replace function public.field_actor_can(p_actor_id uuid,p_permissions text[])
returns boolean language sql stable security definer set search_path=public as $$
 select exists(
  select 1 from public.app_accounts a
  join public.account_roles ar on ar.account_id=a.id
  join public.roles r on r.id=ar.role_id
  left join public.role_permissions rp on rp.role_id=r.id
  where a.id=p_actor_id and a.status='active'
    and (r.code='admin' or rp.permission_key=any(p_permissions))
 )
$$;
revoke all on function public.field_actor_can(uuid,text[]) from public,anon,authenticated;
grant execute on function public.field_actor_can(uuid,text[]) to service_role;
