-- Run once in Supabase: SQL Editor > New query > paste > Run
create table products(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), name text not null, unit text default 'pcs', stock numeric default 0, rate numeric default 0, low_stock numeric default 0, updated_at timestamptz default now());
create table customers(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), name text not null, phone text, created_at timestamptz default now(), unique(user_id,name));
create table bills(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), no int not null, customer_id uuid references customers(id), customer_name text, phone text, total numeric not null, paid numeric not null default 0, created_at timestamptz default now(), unique(user_id,no));
create table bill_items(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), bill_id uuid not null references bills(id) on delete cascade, product_id uuid references products(id), name text not null, qty numeric not null, rate numeric not null);
create table payments(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), customer_id uuid references customers(id), bill_id uuid references bills(id), amount numeric not null, created_at timestamptz default now());

create function reduce_stock() returns trigger language plpgsql security definer as $$
begin if new.product_id is not null then update products set stock = stock - new.qty, updated_at = now() where id = new.product_id and user_id = new.user_id; end if; return new; end $$;
create trigger bill_item_stock after insert on bill_items for each row execute function reduce_stock();

do $$ declare t text; begin
 foreach t in array array['products','customers','bills','bill_items','payments'] loop
  execute format('alter table %I enable row level security', t);
  execute format('create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
 end loop; end $$;

create view customer_due with (security_invoker = true) as
 select user_id, coalesce(customer_id::text, customer_name) as customer, max(customer_name) as name, sum(total - paid) as due
 from bills group by 1,2 having sum(total - paid) > 0;
