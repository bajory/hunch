"use client";

import { useCart, type CartItem } from "./CartProvider";
import type { CartAttribute } from "@/lib/shopify";

function attr(attributes: CartAttribute[], key: string): string {
  return attributes.find((a) => a.key === key)?.value ?? "";
}

function CartItemRow({ item }: { item: CartItem }) {
  const club = attr(item.attributes, "Club");
  const competition = attr(item.attributes, "Competition");
  const name = attr(item.attributes, "Name");
  const number = attr(item.attributes, "Number");
  const size = attr(item.attributes, "Size");

  return (
    <div className="cart-item">
      <div className="cart-item__top">
        <span className="cart-item__club">{club}</span>
        <span className="cart-item__competition">{competition}</span>
      </div>
      {(name || number) && (
        <div className="cart-item__personalization">
          {name && number ? `${name} · ${number}` : name || number}
        </div>
      )}
      <div className="cart-item__attrs">
        <span className="cart-item__attr">{size}</span>
        {competition && <span className="cart-item__attr">{competition}</span>}
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { items, count, drawerOpen, closeDrawer, checkoutUrl } = useCart();

  return (
    <>
      {/* overlay */}
      <div
        className={`drawer-overlay${drawerOpen ? " is-open" : ""}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* panel */}
      <aside
        className={`cart-drawer${drawerOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
      >
        <div className="cart-drawer__head">
          <h2 className="cart-drawer__title">
            {count > 0 ? `Your Bag (${count})` : "Your Bag"}
          </h2>
          <button className="cart-drawer__close" onClick={closeDrawer} aria-label="Close bag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="cart-drawer__body">
          {items.length === 0 ? (
            <div className="cart-drawer__empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M6 8h12l-1 12H7L6 8Z" />
                <path d="M9 8a3 3 0 0 1 6 0" />
              </svg>
              Your bag is empty
            </div>
          ) : (
            items.map((item) => <CartItemRow key={item.id} item={item} />)
          )}
        </div>

        <div className="cart-drawer__foot">
          <button
            className="cart-drawer__checkout"
            disabled={!checkoutUrl && items.length === 0}
            onClick={() => {
              if (checkoutUrl) window.open(checkoutUrl, "_blank");
            }}
          >
            Proceed to Checkout
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          <p className="cart-drawer__note">Secure checkout · Complimentary returns</p>
        </div>
      </aside>
    </>
  );
}
