-- Phase 4A: Order Queue Schema Extension
-- Adds customer information to sales_orders for the order-based POS workflow.

-- Add customer_name and customer_phone to sales_orders
alter table public.sales_orders
  add column if not exists customer_name text not null default '',
  add column if not exists customer_phone text;

-- Add index for customer lookups
create index if not exists sales_orders_customer_name_idx
  on public.sales_orders (organization_id, lower(customer_name))
  where order_status not in ('CANCELLED', 'COMPLETED');
