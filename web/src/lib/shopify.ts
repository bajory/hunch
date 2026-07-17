/* =========================================================================
   Shopify Storefront API client + cart
   -------------------------------------------------------------------------
   Personalization (name, number, competition, patch, size, club) is attached
   to each line as custom attributes, which flow through to checkout and the
   order — that's how the atelier receives the print spec.

   Until NEXT_PUBLIC_SHOPIFY_* env vars are set, isShopifyConfigured() is false
   and the UI falls back to a local bag count (no network calls).

   This is the public, client-safe Storefront token — cart/checkout only.
   The private Admin API client (product/inventory writes) lives in
   shopify-admin.ts, a separate server-only file; that boundary is the
   security boundary between the two tokens, so they're never merged.
   ========================================================================= */

const DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = "2025-01";

export function isShopifyConfigured(): boolean {
  return Boolean(DOMAIN && TOKEN);
}

/** Deep link into the Shopify admin UI for a synced product — used by the
    admin's read-only price/stock display, since those fields are edited in
    Shopify now, not here. Store handle is just the myshopify.com domain
    without its suffix; NEXT_PUBLIC_ so this also works from client code. */
export function shopifyAdminProductUrl(shopifyProductId: string | null | undefined): string | null {
  if (!shopifyProductId || !DOMAIN) return null;
  const handle = DOMAIN.replace(/\.myshopify\.com$/, "");
  const numericId = shopifyProductId.split("/").pop();
  return `https://admin.shopify.com/store/${handle}/products/${numericId}`;
}

export interface CartAttribute { key: string; value: string }
export interface CartLine {
  id: string;
  quantity: number;
  attributes: CartAttribute[];
  merchandiseId: string;
  productTitle: string;
  variantTitle: string;
  image: string | null;
  amount: string;
  currencyCode: string;
}
export interface CartState {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  lines: CartLine[];
  amount: string;
  currencyCode: string;
}

async function storefront<T>(
  query: string,
  variables: Record<string, unknown> = {},
  cache?: { tags: string[] },
): Promise<T> {
  if (!isShopifyConfigured()) throw new Error("Shopify is not configured");
  const res = await fetch(`https://${DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": TOKEN as string,
    },
    body: JSON.stringify({ query, variables }),
    // Mutations (cart create/update) never pass `cache` and stay uncached,
    // same as before this parameter existed — only callers that opt in
    // (getLiveProductData below) are cached and tag-revalidated.
    ...(cache ? { next: { tags: cache.tags } } : {}),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data as T;
}

/** Tag naming shared with the webhook receiver, which calls
    revalidateTag(shopifyProductCacheTag(gid)) on products/update. */
export function shopifyProductCacheTag(shopifyProductId: string): string {
  return `shopify-product:${shopifyProductId}`;
}

export interface LiveVariant {
  variantId: string;
  size: string;
  price: string;
  availableForSale: boolean;
}
export interface LiveProductData {
  price: string;
  currencyCode: string;
  variants: LiveVariant[];
}

interface RawLiveProductNode {
  id: string;
  variants: {
    nodes: {
      id: string;
      price: { amount: string; currencyCode: string };
      availableForSale: boolean;
      selectedOptions: { name: string; value: string }[];
    }[];
  };
}

/** Batched by design (one Storefront call for every product on the page,
    not one call per product) — the shop grid alone can list 60+ products,
    and Storefront API's `nodes(ids:)` supports fetching them together.
    Each product's own cache tag still gets attached to this one fetch, so
    revalidateTag on a single product (from the webhook) correctly expires
    this entry and the next request refetches everyone fresh — a batched
    cache entry with N tags, not N independent ones, which is the right
    trade for avoiding an N+1 API call fan-out on every page load.

    Deliberately doesn't request `quantityAvailable` — that field needs the
    unauthenticated_read_product_inventory Storefront scope, which this
    token doesn't have, and Shopify errors the *entire* query (not just
    that field) when it's requested without access. availableForSale needs
    no special scope and is enough to know purchasable vs not; the exact
    count shown still comes from the Supabase mirror the webhook keeps
    current (see products-db.ts's rowToProduct). */
export async function getLiveProductData(shopifyProductIds: string[]): Promise<Map<string, LiveProductData>> {
  const result = new Map<string, LiveProductData>();
  if (shopifyProductIds.length === 0 || !isShopifyConfigured()) return result;

  const query = `
    query GetLiveProductData($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          variants(first: 20) {
            nodes {
              id
              price { amount currencyCode }
              availableForSale
              selectedOptions { name value }
            }
          }
        }
      }
    }`;

  const d = await storefront<{ nodes: (RawLiveProductNode | null)[] }>(
    query,
    { ids: shopifyProductIds },
    { tags: shopifyProductIds.map(shopifyProductCacheTag) },
  );

  for (const node of d.nodes) {
    if (!node) continue;
    const variants: LiveVariant[] = node.variants.nodes.map((v) => ({
      variantId: v.id,
      size: v.selectedOptions.find((o) => o.name === "Size")?.value ?? "",
      price: v.price.amount,
      availableForSale: v.availableForSale,
    }));
    result.set(node.id, {
      price: variants[0]?.price ?? "0",
      currencyCode: node.variants.nodes[0]?.price.currencyCode ?? "QAR",
      variants,
    });
  }
  return result;
}

const CART_FIELDS = `
  id checkoutUrl totalQuantity
  cost { totalAmount { amount currencyCode } }
  lines(first: 50) {
    nodes {
      id
      quantity
      attributes { key value }
      cost { totalAmount { amount currencyCode } }
      merchandise {
        ... on ProductVariant {
          id
          title
          image { url }
          product { title }
        }
      }
    }
  }
`;

interface RawCartLineNode {
  id: string;
  quantity: number;
  attributes: CartAttribute[];
  cost: { totalAmount: { amount: string; currencyCode: string } };
  merchandise: { id: string; title: string; image: { url: string } | null; product: { title: string } };
}
interface RawCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { totalAmount: { amount: string; currencyCode: string } };
  lines: { nodes: RawCartLineNode[] };
}

function toCartState(raw: RawCart): CartState {
  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    totalQuantity: raw.totalQuantity,
    amount: raw.cost.totalAmount.amount,
    currencyCode: raw.cost.totalAmount.currencyCode,
    lines: raw.lines.nodes.map((n) => ({
      id: n.id,
      quantity: n.quantity,
      attributes: n.attributes,
      merchandiseId: n.merchandise.id,
      productTitle: n.merchandise.product.title,
      variantTitle: n.merchandise.title,
      image: n.merchandise.image?.url ?? null,
      amount: n.cost.totalAmount.amount,
      currencyCode: n.cost.totalAmount.currencyCode,
    })),
  };
}

export async function createCart(): Promise<CartState> {
  const d = await storefront<{ cartCreate: { cart: RawCart } }>(
    `mutation { cartCreate { cart { ${CART_FIELDS} } } }`
  );
  return toCartState(d.cartCreate.cart);
}

export async function getCart(cartId: string): Promise<CartState | null> {
  const d = await storefront<{ cart: RawCart | null }>(
    `query GetCart($cartId: ID!) { cart(id: $cartId) { ${CART_FIELDS} } }`,
    { cartId },
  );
  return d.cart ? toCartState(d.cart) : null;
}

export async function addLine(
  cartId: string,
  merchandiseId: string,
  attributes: CartAttribute[],
  quantity = 1,
): Promise<CartState> {
  const d = await storefront<{ cartLinesAdd: { cart: RawCart } }>(
    `mutation Add($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } }
    }`,
    { cartId, lines: [{ merchandiseId, quantity, attributes }] },
  );
  return toCartState(d.cartLinesAdd.cart);
}

export async function updateLineQuantity(cartId: string, lineId: string, quantity: number): Promise<CartState> {
  const d = await storefront<{ cartLinesUpdate: { cart: RawCart } }>(
    `mutation Update($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } }
    }`,
    { cartId, lines: [{ id: lineId, quantity }] },
  );
  return toCartState(d.cartLinesUpdate.cart);
}

export async function removeLine(cartId: string, lineId: string): Promise<CartState> {
  const d = await storefront<{ cartLinesRemove: { cart: RawCart } }>(
    `mutation Remove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART_FIELDS} } }
    }`,
    { cartId, lineIds: [lineId] },
  );
  return toCartState(d.cartLinesRemove.cart);
}
