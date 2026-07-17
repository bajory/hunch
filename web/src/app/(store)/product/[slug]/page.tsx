import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { productTypeDef, relatedProducts, dedupeByJersey } from "@/lib/products";
import { getProductBySlugFresh } from "@/lib/products-db";
import { getCatalogFresh } from "@/lib/cms";
import { PdpClient } from "@/components/pdp/PdpClient";
import { ProductCard } from "@/components/shop/ProductCard";
import { Reveal } from "@/components/motion/Reveal";
import type { Team, Competition } from "@/lib/catalog";

// Tag-cached, not force-dynamic — see the architecture migration's step 3.
// getProductBySlugFresh/getCatalogFresh are each backed by unstable_cache
// now; admin writes and the Shopify webhook call revalidateTag directly,
// so this still reflects edits immediately.

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getProductBySlugFresh(slug);
  if (!product) return { title: "Product — HUNCH" };
  const title = product.teamName ? `${product.teamName} ${product.name}` : product.name;
  return {
    title: `${title} — HUNCH`,
    description: `Authentic ${product.teamName} ${productTypeDef(product.productType).label.toLowerCase()}, ${product.season} ${product.edition}.`.replace(/\s+/g, " "),
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  // Tag-cached reads (see top of file) — an admin save (product edit, photo,
  // geometry, colours) revalidates its tag directly, so this still shows on
  // the very next load without needing every request to hit Supabase.
  const [{ product, all }, { teams, competitions, print }] = await Promise.all([
    getProductBySlugFresh(slug),
    getCatalogFresh(),
  ]);
  if (!product || product.status === "archived") notFound();

  // Same team + same product type = the PDP's variant toggle (Home/Away/Retro…)
  const siblings = all.filter(
    (p) => p.teamSlug && p.teamSlug === product.teamSlug &&
      p.productType === product.productType && p.status === "available",
  );
  const related = relatedProducts(product, dedupeByJersey(all), 4);

  return (
    <main>
      <PdpClient
        product={product}
        siblings={siblings.length ? siblings : [product]}
        teams={teams as Record<string, Team>}
        competitions={competitions as Record<string, Competition>}
        printMap={print}
      />

      {related.length > 0 && (
        <Reveal className="related wrap">
          <div className="section__head">
            <h2 className="section__title" data-reveal>You may also like</h2>
            <Link href="/shop" className="microlabel" data-reveal>View all →</Link>
          </div>
          <div className="related__grid">
            {related.map((p) => <div key={p.slug} data-reveal><ProductCard product={p} printMap={print} /></div>)}
          </div>
        </Reveal>
      )}
    </main>
  );
}
