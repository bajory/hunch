"use client";

import { useCart, type CartItem } from "./CartProvider";
import type { CartAttribute } from "@/lib/shopify";

function attr(attributes: CartAttribute[], key: string): string {
  return attributes.find((a) => a.key === key)?.value ?? "";
}

function CartItemRow({ item }: { item: CartItem }) {
  const team = attr(item.attributes, "Team") || attr(item.attributes, "Club");
  const kitType = attr(item.attributes, "Kit Type");
  const season = attr(item.attributes, "Season");
  const size = attr(item.attributes, "Size");
  const name = attr(item.attributes, "Name");
  const number = attr(item.attributes, "Number");
  const image = attr(item.attributes, "_Image");

  return (
    <div className="cart__item">
      {image && (
        <div className="cart__item-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" />
        </div>
      )}
      <div className="cart__item-body">
        <span className="cart__item-name">{team}</span>
        <span className="cart__item-attrs">
          {[kitType, season, size && `Size ${size}`].filter(Boolean).join(" · ")}
          {(name || number) && (
            <><br />{[name, number].filter(Boolean).join(" ")} · Personalised</>
          )}
        </span>
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { items, count, drawerOpen, closeDrawer, checkoutUrl } = useCart();

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
          {items.length === 0 ? (
            <div className="cart__empty">
              <span className="microlabel">Nothing here yet</span>
              <p>Your bag is empty.</p>
            </div>
          ) : (
            items.map((item) => <CartItemRow key={item.id} item={item} />)
          )}
        </div>

        <div className="cart__foot">
          <button
            className="btn"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={!checkoutUrl && items.length === 0}
            onClick={() => { if (checkoutUrl) window.open(checkoutUrl, "_blank"); }}
          >
            Checkout
          </button>
          <span className="microlabel" style={{ textAlign: "center" }}>Secure checkout · Complimentary returns</span>
        </div>
      </aside>
    </>
  );
}
