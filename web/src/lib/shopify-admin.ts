/* =========================================================================
   Shopify Admin API — server-only. Never import this from a "use client"
   file; that's the actual security boundary between this and the public
   Storefront client in lib/shopify.ts (which is safe in the browser).

   Auth: this app has no static token. It exchanges SHOPIFY_ADMIN_CLIENT_ID/
   SHOPIFY_ADMIN_CLIENT_SECRET for a short-lived (~24h) access token via the
   client_credentials grant, cached in memory and refreshed on expiry.
   Mutation shapes below were confirmed against the live Admin API schema
   via introspection, not assumed from docs.
   ========================================================================= */

const DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const CLIENT_ID = process.env.SHOPIFY_ADMIN_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET;
const LOCATION_ID = process.env.SHOPIFY_LOCATION_ID;
const HEADLESS_PUBLICATION_ID = process.env.SHOPIFY_HEADLESS_PUBLICATION_ID;
const API_VERSION = "2025-01";

export function isShopifyAdminConfigured(): boolean {
  return Boolean(DOMAIN && CLIENT_ID && CLIENT_SECRET);
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (!isShopifyAdminConfigured()) throw new Error("Shopify Admin API is not configured");
  // 5 minute safety margin before the real 24h expiry.
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60_000) return cachedToken.token;

  const res = await fetch(`https://${DOMAIN}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID as string,
      client_secret: CLIENT_SECRET as string,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`Shopify token exchange failed: ${JSON.stringify(json)}`);
  }
  cachedToken = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.token;
}

export async function adminGraphQL<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(`Shopify Admin API error: ${JSON.stringify(json.errors)}`);
  return json.data as T;
}

export interface ShopifyLocation { id: string; name: string; isActive: boolean }

export async function getLocations(): Promise<ShopifyLocation[]> {
  const d = await adminGraphQL<{ locations: { nodes: ShopifyLocation[] } }>(
    `query { locations(first: 10) { nodes { id name isActive } } }`
  );
  return d.locations.nodes;
}

interface ProductSetVariant {
  size: string;
  price: number;
  quantity: number;
}

export interface CreatedShopifyVariant {
  size: string;
  variantId: string;
  inventoryItemId: string;
  price: number;
  quantity: number;
}

export interface CreatedShopifyProduct {
  productId: string;
  variants: CreatedShopifyVariant[];
}

/** Creates (or, if run again with the same handle, updates) a Shopify
    product with one variant per size, opening inventory set at
    SHOPIFY_LOCATION_ID. Status ACTIVE and published to the "Hunch Headless"
    channel only — DRAFT products are invisible to the Storefront API
    entirely (not just the theme), so ACTIVE is required for checkout to
    work at all. Never published to "Online Store" — that theme stays
    unused; this storefront is the only place these products are browsable. */
export async function createShopifyProduct(input: {
  title: string;
  vendor?: string;
  productType: string;
  variants: ProductSetVariant[];
}): Promise<CreatedShopifyProduct> {
  if (!LOCATION_ID) throw new Error("SHOPIFY_LOCATION_ID is not configured");

  const query = `
    mutation ProductSet($input: ProductSetInput!, $synchronous: Boolean) {
      productSet(input: $input, synchronous: $synchronous) {
        product {
          id
          variants(first: 50) {
            nodes {
              id
              selectedOptions { name value }
              inventoryItem { id }
            }
          }
        }
        userErrors { field message }
      }
    }`;

  const variables = {
    synchronous: true,
    input: {
      title: input.title,
      vendor: input.vendor,
      productType: input.productType,
      status: "ACTIVE",
      productOptions: [
        { name: "Size", values: input.variants.map((v) => ({ name: v.size })) },
      ],
      variants: input.variants.map((v) => ({
        optionValues: [{ optionName: "Size", name: v.size }],
        price: v.price.toFixed(2),
        inventoryQuantities: [{ locationId: LOCATION_ID, name: "available", quantity: v.quantity }],
      })),
    },
  };

  const d = await adminGraphQL<{
    productSet: {
      product: { id: string; variants: { nodes: { id: string; selectedOptions: { name: string; value: string }[]; inventoryItem: { id: string } }[] } } | null;
      userErrors: { field: string[]; message: string }[];
    };
  }>(query, variables);

  const { product, userErrors } = d.productSet;
  if (userErrors.length > 0 || !product) {
    throw new Error(`productSet failed: ${JSON.stringify(userErrors)}`);
  }

  const bySize = new Map(input.variants.map((v) => [v.size, v]));
  const variants: CreatedShopifyVariant[] = product.variants.nodes.map((node) => {
    const size = node.selectedOptions.find((o) => o.name === "Size")?.value ?? "";
    const src = bySize.get(size);
    return {
      size,
      variantId: node.id,
      inventoryItemId: node.inventoryItem.id,
      price: src?.price ?? 0,
      quantity: src?.quantity ?? 0,
    };
  });

  await publishToHeadlessChannel(product.id);

  return { productId: product.id, variants };
}

/** Publishes a product to the "Hunch Headless" sales channel — required
    separately from status: ACTIVE. A product can be ACTIVE and still be
    invisible to the Storefront API if it isn't published to the channel
    associated with that Storefront token. Never call this with the
    "Online Store" publication id — that theme is meant to stay unused. */
export async function publishToHeadlessChannel(productId: string): Promise<void> {
  if (!HEADLESS_PUBLICATION_ID) throw new Error("SHOPIFY_HEADLESS_PUBLICATION_ID is not configured");

  const query = `
    mutation Publish($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { field message }
      }
    }`;
  const d = await adminGraphQL<{ publishablePublish: { userErrors: { field: string[]; message: string }[] } }>(
    query,
    { id: productId, input: [{ publicationId: HEADLESS_PUBLICATION_ID }] },
  );
  const errs = d.publishablePublish.userErrors;
  if (errs.length > 0) throw new Error(`publishablePublish failed: ${JSON.stringify(errs)}`);
}

/** One-off fix for products created before ACTIVE+publish was part of
    createShopifyProduct — sets status ACTIVE and publishes to the
    headless channel for a product that already exists in Shopify. */
export async function activateAndPublishProduct(productId: string): Promise<void> {
  const query = `
    mutation ActivateProduct($product: ProductUpdateInput!) {
      productUpdate(product: $product) {
        userErrors { field message }
      }
    }`;
  const d = await adminGraphQL<{ productUpdate: { userErrors: { field: string[]; message: string }[] } }>(
    query,
    { product: { id: productId, status: "ACTIVE" } },
  );
  if (d.productUpdate.userErrors.length > 0) {
    throw new Error(`productUpdate failed: ${JSON.stringify(d.productUpdate.userErrors)}`);
  }
  await publishToHeadlessChannel(productId);
}

/** Resyncs on-hand quantity for one existing variant — used by the
    "Create in Shopify" / resync admin action, not by the webhook handler
    (which only ever reads inventory changes Shopify already made). */
export async function setInventoryQuantity(inventoryItemId: string, quantity: number): Promise<void> {
  if (!LOCATION_ID) throw new Error("SHOPIFY_LOCATION_ID is not configured");

  const query = `
    mutation InventorySetQuantities($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        userErrors { field message }
      }
    }`;

  const d = await adminGraphQL<{ inventorySetQuantities: { userErrors: { field: string[]; message: string }[] } }>(
    query,
    {
      input: {
        name: "available",
        reason: "correction",
        ignoreCompareQuantity: true,
        quantities: [{ inventoryItemId, locationId: LOCATION_ID, quantity }],
      },
    },
  );
  const errs = d.inventorySetQuantities.userErrors;
  if (errs.length > 0) throw new Error(`inventorySetQuantities failed: ${JSON.stringify(errs)}`);
}
