-- 005: foundational orders and payment records for the live dashboard
begin;

create table public.laundry_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid not null,
  order_number text not null,
  customer_name text not null,
  customer_phone text not null,
  status text not null default 'pending' check (status in ('pending','processing','ready','collected','delivered','cancelled')),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  due_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint laundry_orders_branch_business_fk foreign key (branch_id,business_id) references public.branches(id,business_id) on delete cascade,
  unique (business_id, order_number)
);

create index laundry_orders_business_created_idx on public.laundry_orders(business_id,created_at desc);
create index laundry_orders_branch_created_idx on public.laundry_orders(branch_id,created_at desc);
create index laundry_orders_status_idx on public.laundry_orders(business_id,status);

create table public.laundry_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid not null,
  order_id uuid references public.laundry_orders(id) on delete set null,
  customer_name text,
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('cash','mpesa','card','bank_transfer','other')),
  reference text,
  status text not null default 'completed' check (status in ('pending','completed','failed','refunded')),
  paid_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint laundry_payments_branch_business_fk foreign key (branch_id,business_id) references public.branches(id,business_id) on delete cascade
);
create index laundry_payments_business_paid_idx on public.laundry_payments(business_id,paid_at desc);

alter table public.laundry_orders enable row level security;
alter table public.laundry_payments enable row level security;

create policy "Members with branch access can view orders" on public.laundry_orders
 for select to authenticated using (public.is_business_member(business_id) and public.can_access_branch(branch_id));
create policy "Owners admins and branch members can create orders" on public.laundry_orders
 for insert to authenticated with check (public.is_business_member(business_id) and public.can_access_branch(branch_id));
create policy "Owners admins and branch members can update orders" on public.laundry_orders
 for update to authenticated using (public.is_business_member(business_id) and public.can_access_branch(branch_id))
 with check (public.is_business_member(business_id) and public.can_access_branch(branch_id));
create policy "Members with branch access can view payments" on public.laundry_payments
 for select to authenticated using (public.is_business_member(business_id) and public.can_access_branch(branch_id));
create policy "Members with branch access can record payments" on public.laundry_payments
 for insert to authenticated with check (public.is_business_member(business_id) and public.can_access_branch(branch_id));

grant select,insert,update on public.laundry_orders to authenticated;
grant select,insert on public.laundry_payments to authenticated;
commit;