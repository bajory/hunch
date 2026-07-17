-- ============================================================
-- Retires the PayPal direct-checkout path entirely (see the architecture
-- migration's step 4) — Shopify's own hosted checkout is now the only
-- checkout, so this table's writers (the PayPal capture/create routes)
-- are gone from the codebase. Confirmed before dropping: no real customer
-- orders in this table, only abandoned "created" checkouts and PayPal
-- sandbox test accounts.
-- ============================================================

drop table if exists orders;
