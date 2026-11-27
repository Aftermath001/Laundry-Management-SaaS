-- Migration 004: secure business team invitations
begin;
create table public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid,
  email text not null,
  role text not null check (role in ('admin', 'manager', 'staff')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint business_invitations_branch_business_fk foreign key (branch_id, business_id)
    references public.branches(id, business_id) on delete cascade,
  constraint business_invitations_role_branch_check check (
    (role = 'admin' and branch_id is null) or
    (role in ('manager', 'staff') and branch_id is not null)
  )
);
create unique index business_invitations_pending_email_idx
  on public.business_invitations (business_id, lower(email)) where status = 'pending';
create index business_invitations_business_idx
  on public.business_invitations (business_id, created_at desc);
alter table public.business_invitations enable row level security;
grant select, insert, update on public.business_invitations to authenticated;
create policy "Owners and admins can view invitations" on public.business_invitations
  for select to authenticated using (public.has_business_role(business_id, array['owner', 'admin']));
create policy "Owners and admins can create invitations" on public.business_invitations
  for insert to authenticated with check (
    invited_by = (select auth.uid()) and public.has_business_role(business_id, array['owner', 'admin'])
  );
create policy "Owners and admins can revoke invitations" on public.business_invitations
  for update to authenticated using (public.has_business_role(business_id, array['owner', 'admin']))
  with check (public.has_business_role(business_id, array['owner', 'admin']));

create or replace function public.accept_business_invitation(invitation_token_hash text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  invitation public.business_invitations%rowtype;
  current_user_id uuid := (select auth.uid());
  current_email text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select lower(u.email) into current_email from auth.users u
    where u.id = current_user_id and u.email_confirmed_at is not null;
  if current_email is null then raise exception 'A verified account email is required'; end if;
  select * into invitation from public.business_invitations bi
    where bi.token_hash = invitation_token_hash for update;
  if not found or invitation.status <> 'pending' then
    raise exception 'Invitation is invalid or has already been used';
  end if;
  if invitation.expires_at <= now() then
    update public.business_invitations set status = 'expired' where id = invitation.id;
    raise exception 'Invitation has expired';
  end if;
  if lower(invitation.email) <> current_email then
    raise exception 'Sign in with the email address that received this invitation';
  end if;
  if exists (select 1 from public.business_members bm
    where bm.business_id = invitation.business_id and bm.user_id = current_user_id) then
    raise exception 'You already belong to this business';
  end if;
  insert into public.business_members (business_id, user_id, role, status)
    values (invitation.business_id, current_user_id, invitation.role, 'active');
  if invitation.branch_id is not null then
    insert into public.branch_members (business_id, branch_id, user_id, assigned_by, status)
      values (invitation.business_id, invitation.branch_id, current_user_id, invitation.invited_by, 'active');
  end if;
  update public.business_invitations set status = 'accepted', accepted_at = now()
    where id = invitation.id;
  return jsonb_build_object('business_id', invitation.business_id, 'role', invitation.role,
    'branch_id', invitation.branch_id);
end;
$$;
revoke all on function public.accept_business_invitation(text) from public;
grant execute on function public.accept_business_invitation(text) to authenticated;
commit;
