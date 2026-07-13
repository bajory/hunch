-- ============================================================
-- Shopify sync: links each Supabase product+size to its Shopify
-- product/variant/inventory-item counterpart. Shopify becomes the
-- source of truth for price and stock going forward — this table
-- (and the shopify_* columns on products) is what the migration
-- script and the inventory/product webhooks write into. products.price
-- and products.sizes stay the read path the storefront already uses;
-- only who WRITES them changes. Writes are service-role only (no RLS
-- write policies), matching every other table.
-- ============================================================

alter table products add column shopify_product_id text;
alter table products add column shopify_synced_at timestamptz;
alter table products add column shopify_sync_error text;

create unique index products_shopify_product_id_idx
  on products (shopify_product_id) where shopify_product_id is not null;

-- One row per product+size that has a Shopify variant. Indexed on
-- shopify_inventory_item_id because inventory webhooks identify a
-- stock change only by inventory_item_id, not by product or variant —
-- everything else can join through product_slug.
create table product_shopify_variants (
  id                        bigint generated always as identity primary key,
  product_slug              text not null references products(slug) on delete cascade,
  size                      text not null,
  shopify_variant_id        text not null,
  shopify_inventory_item_id text not null,
  price                     numeric(10,2),
  available                 int not null default 0,
  updated_at                timestamptz not null default now(),
  unique (product_slug, size)
);

create unique index product_shopify_variants_variant_idx
  on product_shopify_variants (shopify_variant_id);
create unique index product_shopify_variants_inv_item_idx
  on product_shopify_variants (shopify_inventory_item_id);

alter table product_shopify_variants enable row level security;
