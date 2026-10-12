create table if not exists public.admin_settings (id int primary key default 1 check (id = 1), pin_hash text not null);
alter table public.admin_settings enable row level security;
revoke all on public.admin_settings from anon, authenticated;
grant all on public.admin_settings to service_role;
insert into public.admin_settings (id, pin_hash) values (1, extensions.crypt('2008', extensions.gen_salt('bf')))
on conflict (id) do update set pin_hash = excluded.pin_hash;

create or replace function public.verify_admin_pin(_pin text)
returns boolean language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.has_role(auth.uid(), 'admin') then return false; end if;
  return exists (select 1 from public.admin_settings where id = 1 and pin_hash = extensions.crypt(_pin, pin_hash));
end $$;
revoke all on function public.verify_admin_pin(text) from public, anon;
grant execute on function public.verify_admin_pin(text) to authenticated;