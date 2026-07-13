"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import type { CartAttribute, CartLine } from "@/lib/shopify";

// QAR has been pegged to USD at this exact rate by Qatari law since 2001 —
// a fixed multiply, shown here only as an estimate; the real charge is
// always computed server-side on the checkout page itself.
const QAR_PER_USD = 3.64;

function attr(attributes: CartAttribute[], key: string): string {
  return attributes.find((a) => a.key === key)?.value ?? "";
}

function CartItemRow({ line, onQuantityChange, onRemove }: {
  line: CartLine;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const team = attr(line.attributes, "Team") || attr(line.attributes, "Club");
  const kitType = attr(line.attributes, "Kit Type");
  const season = attr(line.attributes, "Season");
  const size = attr(line.attributes, "Size");
  const name = attr(line.attributes, "Name");
  const number = attr(line.attributes, "Number");
  // Our own calibrated product photo takes priority over Shopify's generic
  // variant image (which the catalog sync never sets — products live here).
  const image = attr(line.attributes, "_Image") || line.image;

  return (
    <div className="cart__item">
      {image && (
        <div className="cart__item-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" />
        </div>
      )}
      <div className="cart__item-body">
        <span className="cart__item-name">{team || line.productTitle}</span>
        <span className="cart__item-attrs">
          {[kitType, season, size && `Size ${size}`].filter(Boolean).join(" · ")}
          {(name || number) && (
            <><br />{[name, number].filter(Boolean).join(" ")} · Personalised</>
          )}
        </span>
        <div className="cart__item-qty">
          <button onClick={() => onQuantityChange(line.quantity - 1)} aria-label="Decrease quantity" disabled={line.quantity <= 1}>−</button>
          <span>{line.quantity}</span>
          <button onClick={() => onQuantityChange(line.quantity + 1)} aria-label="Increase quantity">+</button>
          <button className="cart__item-remove" onClick={onRemove} aria-label="Remove item">Remove</button>
        </div>
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { cart, count, drawerOpen, closeDrawer, checkoutUrl, updateQuantity, removeItem } = useCart();
  const lines = cart?.lines ?? [];

  return (
    <>
      <div
        className={`cartveil${drawerOpen ? " is-open" : ""}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <aside
        className={`cart${drawerOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
      >
        <div className="cart__head">
          <h2 className="cart__title">{count > 0 ? `Bag · ${count}` : "Bag"}</h2>
          <button className="cart__close" onClick={closeDrawer} aria-label="Close bag">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="cart__body">
          {lines.length === 0 ? (
            <div className="cart__empty">
              <span className="microlabel">Nothing here yet</span>
              <p>Your bag is empty.</p>
            </div>
          ) : (
            lines.map((line) => (
              <CartItemRow
                key={line.id}
                line={line}
                onQuantityChange={(q) => { if (q >= 1) void updateQuantity(line.id, q); }}
                onRemove={() => void removeItem(line.id)}
              />
            ))
          )}
        </div>

        <div className="cart__foot">
          <button
            className="btn"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={!checkoutUrl || lines.length === 0}
            onClick={() => { if (checkoutUrl) window.location.href = checkoutUrl; }}
          >
            Checkout
          </button>
          <span className="microlabel" style={{ textAlign: "center" }}>Secure checkout · Complimentary returns</span>

          {lines.length > 0 && (
            <>
              <div className="paypal-checkout__divider">
                <span>Or pay directly</span>
                <span className="microlabel">≈ ${(Number(cart?.amount ?? 0) / QAR_PER_USD).toFixed(2)}</span>
              </div>
              <Link href="/checkout" className="btn btn--line" style={{ width: "100%", justifyContent: "center" }} onClick={closeDrawer}>
                PayPal, Apple Pay, Google Pay & cards
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
