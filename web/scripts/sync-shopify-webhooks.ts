/**
 * Registers the webhook subscriptions app/api/webhooks/shopify needs —
 * previously created once by hand directly against the Admin API, invisible
 * to the repo (see the architecture review: a deleted subscription meant
 * price/stock sync went silently stale with no error anywhere). Idempotent,
 * safe to run on every deploy.
 *
 * Usage: node --env-file=.env.local scripts/sync-shopify-webhooks.ts
 */
import { isShopifyAdminConfigured, syncWebhookSubscriptions } from "../src/lib/shopify-admin.ts";

async function main() {
  if (!isShopifyAdminConfigured()) {
    console.error("Shopify Admin API is not configured (missing env vars) — skipping webhook sync.");
    process.exit(1);
  }

  const results = await syncWebhookSubscriptions();
  for (const r of results) console.log(`${r.action.padEnd(18)} ${r.topic}`);
  const changed = results.filter((r) => r.action !== "already-correct").length;
  console.log(changed > 0 ? `\n${changed} webhook(s) fixed.` : "\nAll webhooks already correct, nothing to do.");
}

main().catch((e) => {
  console.error("sync-shopify-webhooks failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
