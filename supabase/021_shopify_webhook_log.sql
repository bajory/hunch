-- ============================================================
-- Idempotency log for inbound Shopify webhooks. Shopify's delivery is
-- at-least-once — the same X-Shopify-Webhook-Id can arrive more than once
-- on retry, or after a timeout where Shopify never saw our 200. The
-- receiver route inserts the id before processing and treats a unique-
-- violation as "already handled, skip" — see app/api/webhooks/shopify.
--
-- Retention: not pruned automatically. Shopify's own retry window is a
-- few days, so rows older than ~30 days are safe to delete periodically;
-- not worth a cron job at current volume.
-- ============================================================

create table shopify_webhook_log (
  webhook_id text primary key,
  topic text not null,
  received_at timestamptz not null default now()
);

alter table shopify_webhook_log enable row level security;
