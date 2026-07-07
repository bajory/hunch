import Link from "next/link";
import { formatPrice, sizeOrderFor, KIT_TYPE_LABELS, type Product } from "@/lib/products";
import { livePhotosFor, type PrintEntry, type KitTypeId } from "@/lib/catalog";

export function ProductCard({ product, printMap }: {
  product: Product;
  /** When provided, an admin-uploaded photo overrides the catalog image (jersey kits only). */
  printMap?: Partial<Record<string, PrintEntry>>;
}) {
  const soon = product.status === "coming_soon";
  const isJersey = product.productType === "jersey";
  const live = printMap && isJersey && product.kitType && product.teamSlug
    ? livePhotosFor(product.teamSlug, product.kitType as KitTypeId, printMap)
    : null;
  const front = live?.front || product.images.front;
  const back = live?.back || product.images.back;
  const hasAlt = !!back;

  const subLine = isJersey && product.kitType
    ? `${KIT_TYPE_LABELS[product.kitType]} · ${product.edition}`
    : product.name;

  const media = (
    <div className="pcard__media">
      <div className={`pcard__slides${hasAlt ? " has-alt" : ""}`}>
        <div className="pcard__slide">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={front} alt={`${product.teamName} ${product.name}, front`} loading="lazy" />
        </div>
        {hasAlt && (
          <div className="pcard__slide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={back} alt={`${product.teamName} ${product.name}, back`} loading="lazy" />
          </div>
        )}
      </div>
      {product.badge && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pcard__badge" src={product.badge} alt="" aria-hidden="true" loading="lazy" />
      )}
      {product.season && <span className="pcard__season">{product.season}</span>}
      {hasAlt && !soon && (
        <div className="pcard__dots" aria-hidden="true"><span /><span /></div>
      )}
      {soon && <div className="pcard__veil"><span>Coming Soon</span></div>}
    </div>
  );

  const body = (
    <div className="pcard__body">
      <div className="pcard__row">
        <span className="pcard__name">{product.teamName || product.name}</span>
        {!soon && <span className="pcard__price">{formatPrice(product.price)}</span>}
      </div>
      <span className="pcard__kit">{subLine}</span>
      {!soon && (
        <div className="pcard__sizes">
          {sizeOrderFor(product).map((s) => (
            <span key={s} className={`pcard__size${(product.sizes[s] ?? 0) > 0 ? "" : " is-out"}`}>{s}</span>
          ))}
        </div>
      )}
    </div>
  );

  if (soon) {
    return (
      <div className="pcard pcard--soon" data-team-kind={product.teamKind} data-league={product.league ?? ""} aria-disabled="true">
        {media}{body}
      </div>
    );
  }
  return (
    <Link href={`/product/${product.slug}`} className="pcard" data-cursor="View"
      data-team-kind={product.teamKind} data-league={product.league ?? ""}>
      {media}{body}
    </Link>
  );
}
