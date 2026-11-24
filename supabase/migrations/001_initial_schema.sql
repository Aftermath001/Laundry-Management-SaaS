
-- ==========================================
-- LAUNDRYFLOW: INITIAL DATABASE SCHEMA
-- Migration: 001_initial_schema
-- ==========================================

create extension if not exists pgcrypto;

-- ==========================================
-- 1. BUSINESSES
-- ==========================================

create table public.businesses (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    email text,
    phone text,
    address text,
    status text not null default 'active'
        check (status in ('active', 'suspended', 'pending')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ==========================================
-- 2. BUSINESS MEMBERS
-- ==========================================

create table public.business_members (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null
        references public.businesses(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'staff'
        check (role in ('owner', 'admin', 'manager', 'staff')),
    status text not null default 'active'
        check (status in ('active', 'invited', 'suspended')),
    created_at timestamptz not null default now(),
    unique (business_id, user_id)
);

create index business_members_user_idx
    on public.business_members(user_id);

create index business_members_business_idx
    on public.business_members(business_id);

-- ==========================================
-- 3. BRANCHES
-- ==========================================

create table public.branches (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null
        references public.businesses(id) on delete cascade,
    name text not null,
    code text,
    phone text,
    email text,
    address text,
    is_main boolean not null default false,
    status text not null default 'active'
        check (status in ('active', 'inactive')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (business_id, code)
);

create index branches_business_idx
    on public.branches(business_id);

-- ==========================================
-- 4. SECURITY HELPER FUNCTIONS
-- ==========================================

create or replace function public.is_business_member(
    target_business_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.business_members bm
        where bm.business_id = target_business_id
          and bm.user_id = (select auth.uid())
          and bm.status = 'active'
    );
$$;

create or replace function public.has_business_role(
    target_business_id uuid,
    allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.business_members bm
        where bm.business_id = target_business_id
          and bm.user_id = (select auth.uid())
          and bm.status = 'active'
          and bm.role = any(allowed_roles)
    );
$$;

revoke all on function public.is_business_member(uuid) from public;
revoke all on function public.has_business_role(uuid, text[]) from public;

grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.has_business_role(uuid, text[]) to authenticated;

-- ==========================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ==========================================

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.branches enable row level security;

-- ==========================================
-- 6. BUSINESS POLICIES
-- ==========================================

create policy "Members can view their businesses"
on public.businesses
for select
to authenticated
using (public.is_business_member(id));

create policy "Owners and admins can update businesses"
on public.businesses
for update
to authenticated
using (
    public.has_business_role(id, array['owner', 'admin'])
)
with check (
    public.has_business_role(id, array['owner', 'admin'])
);

-- ==========================================
-- 7. MEMBERSHIP POLICIES
-- ==========================================

create policy "Users can view their own memberships"
on public.business_members
for select
to authenticated
using (user_id = (select auth.uid()));

-- ==========================================
-- 8. BRANCH POLICIES
-- ==========================================

create policy "Business members can view branches"
on public.branches
for select
to authenticated
using (public.is_business_member(business_id));

create policy "Owners and admins can create branches"
on public.branches
for insert
to authenticated
with check (
    public.has_business_role(
        business_id,
        array['owner', 'admin']
    )
);

create policy "Owners and admins can update branches"
on public.branches
for update
to authenticated
using (
    public.has_business_role(
        business_id,
        array['owner', 'admin']
    )
)
with check (
    public.has_business_role(
        business_id,
        array['owner', 'admin']
    )
);

create policy "Owners and admins can delete branches"
on public.branches
for delete
to authenticated
using (
    public.has_business_role(
        business_id,
        array['owner', 'admin']
    )
);

-- ==========================================
-- 9. BUSINESS ONBOARDING FUNCTION
-- ==========================================

create or replace function public.create_business(
    business_name text,
    business_slug text,
    business_email text default null,
    business_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    new_business_id uuid;
    current_user_id uuid;
begin
    current_user_id := (select auth.uid());

    if current_user_id is null then
        raise exception 'Authentication required';
    end if;

    if nullif(trim(business_name), '') is null then
        raise exception 'Business name is required';
    end if;

    if nullif(trim(business_slug), '') is null then
        raise exception 'Business slug is required';
    end if;

    insert into public.businesses (
        name,
        slug,
        email,
        phone
    )
    values (
        trim(business_name),
        lower(trim(business_slug)),
        business_email,
        business_phone
    )
    returning id into new_business_id;

    insert into public.business_members (
        business_id,
        user_id,
        role,
        status
    )
    values (
        new_business_id,
        current_user_id,
        'owner',
        'active'
    );

    return new_business_id;
end;
$$;

revoke all on function public.create_business(text, text, text, text)
from public;

grant execute on function public.create_business(text, text, text, text)
to authenticated;
