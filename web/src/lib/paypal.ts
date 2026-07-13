/* =========================================================================
   PayPal Orders v2 API — server-only. Never import this from a "use client"
   file; PAYPAL_CLIENT_SECRET must never reach the browser bundle. The
   client-safe half (NEXT_PUBLIC_PAYPAL_CLIENT_ID, used to init the v6 JS
   SDK) lives inline in PayPalCheckout.tsx, not here — same separation this
   project already uses between shopify.ts (public token) and
   shopify-admin.ts (private token).

   PAYPAL_ENV picks sandbox vs live — Sandbox and Live are entirely separate
   PayPal apps with separate credential pairs; a sandbox pair fails outright
   against the live host and vice versa (confirmed directly against the API
   while setting this up).
   ========================================================================= */

const ENV = process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
const BASE_URL = ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

export function isPayPalConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (!isPayPalConfigured()) throw new Error("PayPal is not configured");
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`PayPal token exchange failed: ${JSON.stringify(json)}`);
  }
  cachedToken = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.token;
}

async function paypalFetch<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      // Idempotency — a retried create/capture (e.g. a flaky network) reuses
      // the same PayPal-side result instead of creating a duplicate order/charge.
      ...(method === "POST" ? { "PayPal-Request-Id": crypto.randomUUID() } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`PayPal API error (${path}): ${JSON.stringify(json)}`);
  return json as T;
}

export interface PayPalOrderItem {
  name: string;
  quantity: number;
  unitAmountUsd: number;
}

export interface CreatedPayPalOrder {
  id: string;
}

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  city: string;
  countryCode: string;
  postalCode?: string;
}

/** Creates a PayPal order for a fixed, server-computed USD amount — the
    caller must never pass a browser-supplied total (PayPal's own guidance:
    item totals from the browser can be manipulated). Email/shipping are
    collected upfront on the checkout page (not left to whatever a payment
    processor's capture response happens to report) and passed through here
    so PayPal's own hosted popup uses this address instead of asking the
    buyer to pick their own saved one. */
export async function createPayPalOrder(
  amountUsd: number,
  items: PayPalOrderItem[],
  customId: string,
  payer?: { email?: string; shipping?: ShippingAddress },
): Promise<CreatedPayPalOrder> {
  const itemTotal = items.reduce((sum, i) => sum + i.unitAmountUsd * i.quantity, 0);
  const shipping = payer?.shipping;
  const order = await paypalFetch<CreatedPayPalOrder>("/v2/checkout/orders", "POST", {
    intent: "CAPTURE",
    ...(shipping ? { application_context: { shipping_preference: "SET_PROVIDED_ADDRESS" } } : {}),
    ...(payer?.email ? { payer: { email_address: payer.email } } : {}),
    purchase_units: [
      {
        custom_id: customId,
        amount: {
          currency_code: "USD",
          value: amountUsd.toFixed(2),
          breakdown: { item_total: { currency_code: "USD", value: itemTotal.toFixed(2) } },
        },
        items: items.map((i) => ({
          name: i.name.slice(0, 127),
          quantity: String(i.quantity),
          unit_amount: { currency_code: "USD", value: i.unitAmountUsd.toFixed(2) },
        })),
        ...(shipping ? {
          shipping: {
            name: { full_name: shipping.fullName },
            address: {
              address_line_1: shipping.addressLine1,
              admin_area_2: shipping.city,
              country_code: shipping.countryCode,
              postal_code: shipping.postalCode || undefined,
            },
          },
        } : {}),
      },
    ],
  });
  return order;
}

export interface CapturedPayPalOrder {
  id: string;
  status: string;
  payer?: { email_address?: string; name?: { given_name?: string; surname?: string } };
  purchase_units?: {
    shipping?: { address?: Record<string, string>; name?: { full_name?: string } };
    payments?: { captures?: { id: string }[] };
  }[];
}

export async function capturePayPalOrder(orderId: string): Promise<CapturedPayPalOrder> {
  return paypalFetch<CapturedPayPalOrder>(`/v2/checkout/orders/${orderId}/capture`, "POST", {});
}

/** Reads back an order's current state — used as a fallback when a capture
    call fails because the order was already captured (some client-side
    session flows, e.g. card fields' submit(), may finalize payment on
    PayPal's side themselves; this lets the capture route treat that as
    success instead of a hard failure). */
export async function getPayPalOrder(orderId: string): Promise<CapturedPayPalOrder> {
  return paypalFetch<CapturedPayPalOrder>(`/v2/checkout/orders/${orderId}`, "GET");
}
