"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { PayPalCheckout, type ShippingAddress } from "@/components/PayPalCheckout";
import { formatPrice } from "@/lib/products";
import type { CartAttribute, CartLine } from "@/lib/shopify";

const COUNTRIES: { code: string; name: string }[] = [
  { code: "QA", name: "Qatar" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "KW", name: "Kuwait" },
  { code: "BH", name: "Bahrain" },
  { code: "OM", name: "Oman" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
];

function attr(attributes: CartAttribute[], key: string): string {
  return attributes.find((a) => a.key === key)?.value ?? "";
}

function CheckoutLineRow({ line }: { line: CartLine }) {
  const team = attr(line.attributes, "Team") || attr(line.attributes, "Club");
  const kitType = attr(line.attributes, "Kit Type");
  const season = attr(line.attributes, "Season");
  const size = attr(line.attributes, "Size");
  const name = attr(line.attributes, "Name");
  const number = attr(line.attributes, "Number");
  const image = attr(line.attributes, "_Image") || line.image;

  return (
    <div className="checkout__line">
      {image && (
        <div className="checkout__line-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" />
          <span className="checkout__line-qty">{line.quantity}</span>
        </div>
      )}
      <div className="checkout__line-body">
        <span className="checkout__line-name">{team || line.productTitle}</span>
        <span className="checkout__line-attrs">
          {[kitType, season, size && `Size ${size}`].filter(Boolean).join(" · ")}
          {(name || number) && (
            <><br />{[name, number].filter(Boolean).join(" ")} · Personalised</>
          )}
        </span>
      </div>
      <span className="checkout__line-price">{formatPrice(Number(line.amount))}</span>
    </div>
  );
}

export function CheckoutClient() {
  const { cart } = useCart();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("QA");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");

  const shippingAddress: ShippingAddress | null =
    fullName && addressLine1 && city && countryCode
      ? { fullName, addressLine1, city, countryCode, postalCode: postalCode || undefined }
      : null;

  const lines = cart?.lines ?? [];

  if (lines.length === 0) {
    return (
      <div className="wrap checkout">
        <div className="checkout__empty">
          <span className="microlabel">Nothing here yet</span>
          <p>Your bag is empty.</p>
          <Link href="/shop" className="btn">Continue shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap checkout">
      <h1 className="checkout__title">Checkout</h1>
      <div className="checkout__grid">
        <div className="checkout__form">
          <section className="checkout__section">
            <h2 className="checkout__heading">Contact</h2>
            <div className="checkout__field">
              <label htmlFor="co-email">Email</label>
              <input id="co-email" type="email" autoComplete="email" placeholder="you@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </section>

          <section className="checkout__section">
            <h2 className="checkout__heading">Shipping address</h2>
            <p className="checkout__hint">
              Only needed for PayPal or card — Apple Pay and Google Pay collect this for you.
            </p>
            <div className="checkout__field">
              <label htmlFor="co-name">Full name</label>
              <input id="co-name" type="text" autoComplete="name" placeholder="Full name"
                value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="checkout__field">
              <label htmlFor="co-address">Address</label>
              <input id="co-address" type="text" autoComplete="address-line1" placeholder="Street address"
                value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
            </div>
            <div className="checkout__row">
              <div className="checkout__field">
                <label htmlFor="co-city">City</label>
                <input id="co-city" type="text" autoComplete="address-level2" placeholder="City"
                  value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="checkout__field">
                <label htmlFor="co-postal">Postal code</label>
                <input id="co-postal" type="text" autoComplete="postal-code" placeholder="Optional"
                  value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
            </div>
            <div className="checkout__row">
              <div className="checkout__field">
                <label htmlFor="co-country">Country</label>
                <select id="co-country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div className="checkout__field">
                <label htmlFor="co-phone">Phone (optional)</label>
                <input id="co-phone" type="tel" autoComplete="tel" placeholder="Phone"
                  value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="checkout__section">
            <PayPalCheckout email={email} shippingAddress={shippingAddress} />
          </section>
        </div>

        <aside className="checkout__summary">
          <h2 className="checkout__heading">Order summary</h2>
          <div className="checkout__lines">
            {lines.map((line) => <CheckoutLineRow key={line.id} line={line} />)}
          </div>
          <div className="checkout__totalrow">
            <span>Total</span>
            <b>{formatPrice(Number(cart?.amount ?? 0))}</b>
          </div>
        </aside>
      </div>
    </div>
  );
}
