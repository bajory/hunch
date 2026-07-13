-- ============================================================
-- PayPal direct-checkout orders — a payment path parallel to Shopify's
-- hosted checkout (PayPal/Apple Pay/Google Pay/cards via the PayPal JS SDK,
-- rendered directly in the cart drawer). These orders never touch Shopify's
-- checkout, so Shopify's own order/inventory/email automation never fires
-- for them — this table, plus the capture route's own inventory decrement
-- and confirmation email, is what stands in for that. Service-role only
-- writes (no RLS policies), matching every other table.
-- ============================================================

create table orders (
  id                bigint generated always as identity primary key,
  paypal_order_id   text not null unique,
  paypal_capture_id text,
  status            text not null default 'created' check (status in ('created', 'captured', 'failed')),
  amount_usd        numeric(10,2) not null,
  amount_qar        numeric(10,2) not null,
  customer_email    text,
  customer_name     text,
  shipping_address  jsonb,
  -- Snapshot of the cart at order-create time: [{ slug, size, quantity,
  -- unit_price_qar, title, attributes }] — attributes carries the same
  -- personalization data (Name/Number/Competition/Patch) already used as
  -- Shopify cart line attributes, so fulfillment reads one consistent shape
  -- regardless of which checkout path an order came through.
  line_items        jsonb not null,
  created_at        timestamptz not null default now(),
  captured_at       timestamptz
);

alter table orders enable row level security;
