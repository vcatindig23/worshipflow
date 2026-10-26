-- Remove references before deleting underlying account-owned Storage objects.
-- A partial failure leaves the account active so cleanup can be retried.
create function public.clear_account_upload_references(p_bucket_id text,p_paths text[])
returns void language plpgsql security definer set search_path='' as $$
begin
  if (select auth.role()) is distinct from 'service_role' then raise insufficient_privilege; end if;
  if cardinality(p_paths)>200 then raise exception 'UPLOAD_BATCH_TOO_LARGE'; end if;
  if p_bucket_id='workspace-files' then
    update public.songs set reference_audio_path=null where reference_audio_path=any(p_paths);
    delete from public.setlist_resources where storage_path=any(p_paths);
  end if;
end $$;
revoke all on function public.clear_account_upload_references(text,text[]) from public, anon, authenticated;
grant execute on function public.clear_account_upload_references(text,text[]) to service_role;
