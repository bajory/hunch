/* =========================================================================
   Shopify Storefront API client + cart
   -------------------------------------------------------------------------
   Personalization (name, number, competition, patch, size, club) is attached
   to each line as custom attributes, which flow through to checkout and the
   order — that's how the atelier receives the print spec.

   Until NEXT_PUBLIC_SHOPIFY_* env vars are set, isShopifyConfigured() is false
   and the UI falls back to a local bag count (no network calls).
   ========================================================================= */

const DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = "2025-01";

export function isShopifyConfigured(): boolean {
  return Boolean(DOMAIN && TOKEN);
}

export interface CartAttribute { key: string; value: string }
export interface CartState { id: string; checkoutUrl: string; totalQuantity: number }

async function storefront<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!isShopifyConfigured()) throw new Error("Shopify is not configured");
  const res = await fetch(`https://${DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": TOKEN as string,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data as T;
}

const CART_FIELDS = `id checkoutUrl totalQuantity`;

export async function createCart(): Promise<CartState> {
  const d = await storefront<{ cartCreate: { cart: CartState } }>(
    `mutation { cartCreate { cart { ${CART_FIELDS} } } }`
  );
  return d.cartCreate.cart;
}

export async function addLine(
  cartId: string,
  merchandiseId: string,
  attributes: CartAttribute[],
  quantity = 1,
): Promise<CartState> {
  const d = await storefront<{ cartLinesAdd: { cart: CartState } }>(
    `mutation Add($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } }
    }`,
    { cartId, lines: [{ merchandiseId, quantity, attributes }] },
  );
  return d.cartLinesAdd.cart;
}
