-- 006: business service catalogue and itemized laundry orders
begin;

create table public.laundry_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  unit text not null default 'item'
    check (unit in ('item','kg','load','pair')),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint laundry_services_name_unique unique (business_id, name),
  constraint laundry_services_id_business_unique unique (id, business_id)
);

create index laundry_services_business_active_idx
  on public.laundry_services (business_id, is_active, name);

alter table public.laundry_orders
  add constraint laundry_orders_id_business_unique unique (id, business_id);

create table public.laundry_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  business_id uuid not null,
  service_id uuid not null,
  service_name text not null,
  unit text not null check (unit in ('item','kg','load','pair')),
  quantity numeric(10,2) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2)
    generated always as (round(quantity * unit_price, 2)) stored,
  created_at timestamptz not null default now(),
  constraint laundry_order_items_order_fk
    foreign key (order_id, business_id)
    references public.laundry_orders(id, business_id) on delete cascade,
  constraint laundry_order_items_service_fk
    foreign key (service_id, business_id)
    references public.laundry_services(id, business_id) on delete restrict
);

create index laundry_order_items_order_idx
  on public.laundry_order_items (order_id);

alter table public.laundry_services enable row level security;
alter table public.laundry_order_items enable row level security;

create policy "Business members can view service catalogue"
  on public.laundry_services
  for select to authenticated
  using (public.is_business_member(business_id));

create policy "Business owners and admins can create services"
  on public.laundry_services
  for insert to authenticated
  with check (public.has_business_role(business_id, array['owner','admin']));

create policy "Business owners and admins can update services"
  on public.laundry_services
  for update to authenticated
  using (public.has_business_role(business_id, array['owner','admin']))
  with check (public.has_business_role(business_id, array['owner','admin']));

create policy "Business owners and admins can delete unused services"
  on public.laundry_services
  for delete to authenticated
  using (public.has_business_role(business_id, array['owner','admin']));

create policy "Members with branch access can view order items"
  on public.laundry_order_items
  for select to authenticated
  using (
    public.is_business_member(business_id)
    and exists (
      select 1
      from public.laundry_orders o
      where o.id = laundry_order_items.order_id
        and o.business_id = laundry_order_items.business_id
        and public.can_access_branch(o.branch_id)
    )
  );

create policy "Members with branch access can add order items"
  on public.laundry_order_items
  for insert to authenticated
  with check (
    public.is_business_member(business_id)
    and exists (
      select 1
      from public.laundry_orders o
      where o.id = laundry_order_items.order_id
        and o.business_id = laundry_order_items.business_id
        and public.can_access_branch(o.branch_id)
    )
    and exists (
      select 1
      from public.laundry_services s
      where s.id = laundry_order_items.service_id
        and s.business_id = laundry_order_items.business_id
        and s.is_active = true
    )
  );

grant select, insert, update, delete on public.laundry_services to authenticated;
grant select, insert on public.laundry_order_items to authenticated;

commit;
