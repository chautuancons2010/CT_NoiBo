-- Finalize metadata only after the service has removed the storage objects.
-- Keep attendance rows and unrelated document versions intact.
create or replace function public.finalize_attendance_evidence_expiry(p_kind text, p_photo_ids uuid[])
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_assets uuid[]; v_photos uuid[]; v_bucket text;
begin
  if p_kind not in ('attendance_photos','worker_attendance_photos') then
    raise exception 'INVALID_EVIDENCE_KIND';
  end if;
  v_bucket := case p_kind when 'attendance_photos' then 'attendance-photos' else 'worker-attendance-photos' end;
  execute format('select array_agg(id), array_remove(array_agg(file_id) || array_agg(thumbnail_file_id),null) from (select id,file_id,thumbnail_file_id from public.%I where id=any($1) and evidence_status=''available'' and captured_at<=now()-interval ''45 days'' for update) p',p_kind)
    into v_photos,v_assets using p_photo_ids;
  if coalesce(cardinality(v_photos),0)=0 then return 0; end if;
  if exists(select 1 from file_assets where id=any(v_assets) and bucket<>v_bucket) then
    raise exception 'INVALID_EVIDENCE_BUCKET';
  end if;

  delete from document_versions where file_id=any(v_assets);
  -- A document may have other, newer versions. Retain those versions and links.
  update documents d set current_file_id=v.file_id,current_version=v.version_number,status='archived',updated_at=now()
    from (select distinct on (document_id) document_id,file_id,version_number from document_versions order by document_id,version_number desc) v
    where d.id=v.document_id and d.current_file_id=any(v_assets);
  delete from documents d where d.current_file_id=any(v_assets)
    and not exists(select 1 from document_versions v where v.document_id=d.id);
  execute format('update public.%I set file_id=null,thumbnail_file_id=null,evidence_status=''expired'',evidence_deleted_at=now() where id=any($1)',p_kind) using v_photos;
  delete from file_assets where id=any(v_assets);
  return cardinality(v_photos);
end;
$$;
revoke all on function public.finalize_attendance_evidence_expiry(text,uuid[]) from public,anon,authenticated;
grant execute on function public.finalize_attendance_evidence_expiry(text,uuid[]) to service_role;
