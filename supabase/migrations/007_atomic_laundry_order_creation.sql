-- 007: atomic order creation with server-side pricing and branch authorization

create or replace function public.create_laundry_order(
  p_business_id uuid,
  p_branch_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb,
  p_due_at timestamptz default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_order_id uuid := gen_random_uuid();
  new_order_number text;
  item_count integer;
  valid_item_count integer;
  calculated_total numeric(12,2);
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = current_user_id
      and bm.status = 'active'
  ) then
    raise exception 'You do not have access to this business' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.branches b
    where b.id = p_branch_id
      and b.business_id = p_business_id
      and b.status = 'active'
  ) then
    raise exception 'Branch not found or inactive' using errcode = '22023';
  end if;

  if not public.can_access_branch(p_business_id, p_branch_id) then
    raise exception 'You do not have access to this branch' using errcode = '42501';
  end if;

  if nullif(trim(p_customer_name), '') is null
     or nullif(trim(p_customer_phone), '') is null then
    raise exception 'Customer name and phone are required' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Order items must be provided as an array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'An order must contain between 1 and 50 items' using errcode = '22023';
  end if;

  select count(*) into item_count
  from jsonb_to_recordset(p_items) as item(service_id uuid, quantity numeric)
  where item.service_id is not null
    and item.quantity > 0
    and item.quantity <= 100000
    and item.quantity = round(item.quantity, 2);

  if item_count <> jsonb_array_length(p_items) then
    raise exception 'Each order item requires a valid service and positive quantity' using errcode = '22023';
  end if;

  select
    count(*),
    coalesce(sum(round(item.quantity * service.unit_price, 2)), 0)
  into valid_item_count, calculated_total
  from jsonb_to_recordset(p_items) as item(service_id uuid, quantity numeric)
  join public.laundry_services service
    on service.id = item.service_id
   and service.business_id = p_business_id
   and service.is_active = true;

  if valid_item_count <> item_count then
    raise exception 'One or more services are unavailable' using errcode = '22023';
  end if;

  new_order_number :=
    'LF-' || to_char(now() at time zone 'UTC', 'YYMMDD') || '-' ||
    upper(substr(replace(new_order_id::text, '-', ''), 1, 8));

  insert into public.laundry_orders (
    id, business_id, branch_id, order_number, customer_name,
    customer_phone, total_amount, due_at, notes, created_by
  ) values (
    new_order_id, p_business_id, p_branch_id, new_order_number,
    trim(p_customer_name), trim(p_customer_phone), calculated_total,
    p_due_at, nullif(trim(p_notes), ''), current_user_id
  );

  insert into public.laundry_order_items (
    order_id, business_id, service_id, service_name, unit, quantity, unit_price
  )
  select
    new_order_id, p_business_id, service.id, service.name, service.unit,
    item.quantity, service.unit_price
  from jsonb_to_recordset(p_items) as item(service_id uuid, quantity numeric)
  join public.laundry_services service
    on service.id = item.service_id
   and service.business_id = p_business_id
   and service.is_active = true;

  return new_order_id;
end;
$$;

revoke all on function public.create_laundry_order(
  uuid, uuid, text, text, jsonb, timestamptz, text
) from public;

grant execute on function public.create_laundry_order(
  uuid, uuid, text, text, jsonb, timestamptz, text
) to authenticated;


-- Normalize branch-scoped policies to the composite business/branch access helper.
drop policy if exists "Members with branch access can view orders"
  on public.laundry_orders;
create policy "Members with branch access can view orders"
  on public.laundry_orders
  for select to authenticated
  using (
    public.is_business_member(business_id)
    and public.can_access_branch(business_id, branch_id)
  );

drop policy if exists "Owners admins and branch members can create orders"
  on public.laundry_orders;
create policy "Owners admins and branch members can create orders"
  on public.laundry_orders
  for insert to authenticated
  with check (
    public.is_business_member(business_id)
    and public.can_access_branch(business_id, branch_id)
  );

drop policy if exists "Owners admins and branch members can update orders"
  on public.laundry_orders;
create policy "Owners admins and branch members can update orders"
  on public.laundry_orders
  for update to authenticated
  using (
    public.is_business_member(business_id)
    and public.can_access_branch(business_id, branch_id)
  )
  with check (
    public.is_business_member(business_id)
    and public.can_access_branch(business_id, branch_id)
  );

drop policy if exists "Members with branch access can view order items"
  on public.laundry_order_items;
create policy "Members with branch access can view order items"
  on public.laundry_order_items
  for select to authenticated
  using (
    public.is_business_member(business_id)
    and exists (
      select 1
      from public.laundry_orders orders
      where orders.id = laundry_order_items.order_id
        and orders.business_id = laundry_order_items.business_id
        and public.can_access_branch(orders.business_id, orders.branch_id)
    )
  );

drop policy if exists "Members with branch access can add order items"
  on public.laundry_order_items;
create policy "Members with branch access can add order items"
  on public.laundry_order_items
  for insert to authenticated
  with check (
    public.is_business_member(business_id)
    and exists (
      select 1
      from public.laundry_orders orders
      where orders.id = laundry_order_items.order_id
        and orders.business_id = laundry_order_items.business_id
        and public.can_access_branch(orders.business_id, orders.branch_id)
    )
    and exists (
      select 1
      from public.laundry_services services
      where services.id = laundry_order_items.service_id
        and services.business_id = laundry_order_items.business_id
        and services.is_active = true
    )
  );
