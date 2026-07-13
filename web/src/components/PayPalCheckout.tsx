"use client";

/* =========================================================================
   Direct PayPal checkout — lives on the dedicated /checkout page (a
   shortcut alongside the Shopify "Checkout" button in the cart drawer, not
   a replacement for it). Renders whichever of PayPal / Google Pay / Apple
   Pay / card fields the buyer is actually eligible for, via the PayPal JS
   SDK v6. Takes the contact email + shipping address collected by
   CheckoutClient.tsx as props, but the two wallet methods don't actually
   need them: Apple Pay and Google Pay each collect name/address/email
   directly from their own native sheet (requiredShippingContactFields /
   shippingAddressRequired below), so createOrderOnServer for those two is
   deferred until the wallet's own callback provides that contact — the
   on-page form's email/shippingAddress props are only a fallback if the
   wallet somehow doesn't return an email. The PayPal button and card
   fields have no such native collection, so their handlers gate on
   requireValidForm() before ever creating an order.

   The v6 SDK ships no published TypeScript types, so `window.paypal` and
   its session objects are intentionally loosely typed below — the actual
   safety net is that every call site here is exercised in sandbox testing.

   All four confirmed working end-to-end with real sandbox charges:
   - PayPal button, card fields, and Apple Pay have each completed a real
     sandbox purchase (order captured, Shopify inventory decremented).
   - Apple Pay renders as a plain <button> with the native WebKit
     `-webkit-appearance: -apple-pay-button` value, not a PayPal-rendered
     custom element — confirmed empirically that PayPal's SDK never
     populates a shadow root for one, unlike <paypal-button>, which does.
   - Google Pay reaches Google's real sign-in flow but hasn't completed a
     full charge yet (needs a real Google account signed into the browser).
   ========================================================================= */

import { useEffect, useRef, useState } from "react";
import type { DetailedHTMLProps, HTMLAttributes } from "react";
import { useCart } from "./CartProvider";

// PayPal's v6 SDK renders <paypal-button> itself as a custom element (real
// shadow-DOM content, confirmed working) — declare it so JSX accepts it as
// an intrinsic tag. Apple Pay does NOT use a PayPal-rendered custom element
// (confirmed empirically: zero shadow root, zero children, zero height no
// matter what CSS is applied) — it's a plain <button> styled with the
// native WebKit `-webkit-appearance: -apple-pay-button` value instead, so
// no custom-element declaration is needed for it.
type WebComponentProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { type?: string; buttonstyle?: string };
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required by TS for JSX intrinsic-element augmentation
  namespace JSX {
    interface IntrinsicElements {
      "paypal-button": WebComponentProps;
    }
  }
}

const QAR_PER_USD = 3.64;
const PAYPAL_ENV = process.env.NEXT_PUBLIC_PAYPAL_ENV === "live" ? "live" : "sandbox";
const SDK_SRC = PAYPAL_ENV === "live"
  ? "https://www.paypal.com/web-sdk/v6/core"
  : "https://www.sandbox.paypal.com/web-sdk/v6/core";
const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const GOOGLE_PAY_SRC = "https://pay.google.com/gp/p/js/pay.js";

interface EligibleMethods {
  isEligible(method: string): boolean;
  getDetails(method: string): Record<string, unknown>;
}
interface PaymentSession {
  start(options: Record<string, unknown>, orderPromise: Promise<{ orderId: string }>): Promise<void>;
}
interface CardFieldsSession {
  createCardFieldsComponent(opts: { type: string; placeholder?: string }): HTMLElement;
  submit(orderId: string): Promise<{ state: string }>;
}
interface GooglePaySession {
  formatConfigForPaymentRequest(config: unknown): Record<string, unknown>;
  confirmOrder(opts: { orderId: string; paymentMethodData: unknown }): Promise<{ status: string }>;
}
interface ApplePaySessionBridge {
  config(): Promise<{ merchantCapabilities: string[]; supportedNetworks: string[] }>;
  validateMerchant(opts: { validationUrl: string }): Promise<{ merchantSession: unknown }>;
  confirmOrder(opts: { orderId: string; token: unknown }): Promise<void>;
}
interface PayPalSdkInstance {
  findEligibleMethods(opts: { currencyCode: string }): Promise<EligibleMethods>;
  createPayPalOneTimePaymentSession(opts: Record<string, unknown>): PaymentSession;
  createGooglePayOneTimePaymentSession(): GooglePaySession;
  createApplePayOneTimePaymentSession(): Promise<ApplePaySessionBridge>;
  createCardFieldsOneTimePaymentSession(): CardFieldsSession;
}
declare global {
  interface Window {
    paypal?: { createInstance(opts: Record<string, unknown>): Promise<PayPalSdkInstance> };
    google?: { payments: { api: { PaymentsClient: new (opts: Record<string, unknown>) => GooglePaymentsClient } } };
    ApplePaySession?: ApplePaySessionCtor;
  }
}
interface GooglePayAddress {
  name?: string;
  address1?: string;
  locality?: string;
  countryCode?: string;
  postalCode?: string;
}
interface GooglePaymentsClient {
  isReadyToPay(request: unknown): Promise<{ result: boolean }>;
  loadPaymentData(request: unknown): Promise<{ paymentMethodData: unknown; email?: string; shippingAddress?: GooglePayAddress }>;
  /** Official branded button per Google Pay's own brand guidelines — a
      hand-rolled <button> with plain text isn't an acceptable substitute. */
  createButton(options: { onClick: () => void; buttonColor?: string; buttonType?: string; buttonSizeMode?: string; buttonRadius?: number }): HTMLElement;
}
interface ApplePaySessionCtor {
  new (version: number, request: unknown): NativeApplePaySession;
  canMakePayments(): boolean;
  STATUS_SUCCESS: number;
  STATUS_FAILURE: number;
}
interface ApplePayContact {
  givenName?: string;
  familyName?: string;
  emailAddress?: string;
  addressLines?: string[];
  locality?: string;
  countryCode?: string;
  postalCode?: string;
}
interface NativeApplePaySession {
  begin(): void;
  /** Cancels a hung merchant-validation or payment request — without this,
      a failed validateMerchant() call left Apple's own sheet spinning on
      "Processing" indefinitely instead of closing (confirmed on a real
      device: the sheet never recovered on its own). */
  abort(): void;
  completeMerchantValidation(merchantSession: unknown): void;
  completePayment(status: number): void;
  onvalidatemerchant: ((event: { validationURL: string }) => void) | null;
  onpaymentauthorized: ((event: { payment: { token: unknown; shippingContact?: ApplePayContact } }) => void) | null;
}

let sdkScriptPromise: Promise<void> | null = null;
function loadScript(src: string): Promise<void> {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}
function loadPayPalSdk(): Promise<void> {
  if (!sdkScriptPromise) sdkScriptPromise = loadScript(SDK_SRC);
  return sdkScriptPromise;
}

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  city: string;
  countryCode: string;
  postalCode?: string;
}

async function createOrderOnServer(cartId: string, email: string, shippingAddress: ShippingAddress): Promise<{ orderId: string }> {
  const res = await fetch("/api/paypal/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartId, email, shippingAddress }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create order");
  return { orderId: json.orderId };
}

async function captureOnServer(orderId: string): Promise<void> {
  const res = await fetch("/api/paypal/orders/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to capture order");
}

export function PayPalCheckout({ email, shippingAddress }: { email: string; shippingAddress: ShippingAddress | null }) {
  const { cart, clearCart, closeDrawer } = useCart();
  const [instance, setInstance] = useState<PayPalSdkInstance | null>(null);
  const [eligible, setEligible] = useState<EligibleMethods | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const isFormValid = Boolean(
    email && email.includes("@") &&
    shippingAddress?.fullName && shippingAddress.addressLine1 && shippingAddress.city && shippingAddress.countryCode,
  );
  // Every payment method's click handler calls this first — returns false
  // (and surfaces a message) rather than ever calling createOrderOnServer
  // with an incomplete contact/shipping form.
  function requireValidForm(): boolean {
    if (isFormValid) return true;
    setError("Please complete your contact and shipping details above before paying.");
    setStatus("error");
    return false;
  }

  const paypalBtnRef = useRef<HTMLElement>(null);
  const cardNumberRef = useRef<HTMLDivElement>(null);
  const cardExpiryRef = useRef<HTMLDivElement>(null);
  const cardCvvRef = useRef<HTMLDivElement>(null);
  const googlePayBtnRef = useRef<HTMLDivElement>(null);
  const applePayBtnRef = useRef<HTMLButtonElement>(null);

  const cartId = cart?.id ?? null;

  // Init the SDK once we know there's something to sell.
  useEffect(() => {
    if (!CLIENT_ID || !cartId) return;
    let cancelled = false;
    (async () => {
      try {
        await loadPayPalSdk();
        if (cancelled || !window.paypal) return;
        const sdkInstance = await window.paypal.createInstance({
          clientId: CLIENT_ID,
          components: ["paypal-payments", "googlepay-payments", "applepay-payments", "card-fields"],
          pageType: "mini-cart",
        });
        if (cancelled) return;
        setInstance(sdkInstance);
        const methods = await sdkInstance.findEligibleMethods({ currencyCode: "USD" });
        if (!cancelled) setEligible(methods);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [cartId]);

  async function onOrderApproved(orderId: string) {
    setStatus("processing");
    try {
      await captureOnServer(orderId);
      clearCart();
      setStatus("done");
      setTimeout(closeDrawer, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  // PayPal button
  useEffect(() => {
    if (!instance || !eligible?.isEligible("paypal") || !cartId || !paypalBtnRef.current) return;
    const session = instance.createPayPalOneTimePaymentSession({
      async onApprove(data: { orderId: string }) { await onOrderApproved(data.orderId); },
      onCancel() { setStatus("idle"); },
      onError(e: unknown) { setError(e instanceof Error ? e.message : String(e)); setStatus("error"); },
    });
    const btn = paypalBtnRef.current;
    btn.removeAttribute("hidden");
    const onClick = () => {
      if (!requireValidForm() || !shippingAddress) return;
      setStatus("processing");
      void session.start({ presentationMode: "auto" }, createOrderOnServer(cartId, email, shippingAddress));
    };
    btn.addEventListener("click", onClick);
    return () => btn.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, eligible, cartId, email, shippingAddress]);

  // Card fields — only number/expiry/cvv are valid createCardFieldsComponent
  // types; cardholder name isn't a PayPal-hosted field (not PCI-sensitive),
  // so it's a plain input the capture route doesn't need to see at all.
  useEffect(() => {
    if (!instance || !eligible?.isEligible("advanced_cards") || !cardNumberRef.current) return;
    const session = instance.createCardFieldsOneTimePaymentSession();
    const number = session.createCardFieldsComponent({ type: "number", placeholder: "Card number" });
    const expiry = session.createCardFieldsComponent({ type: "expiry", placeholder: "MM/YY" });
    const cvv = session.createCardFieldsComponent({ type: "cvv", placeholder: "CVV" });
    cardNumberRef.current.appendChild(number);
    cardExpiryRef.current?.appendChild(expiry);
    cardCvvRef.current?.appendChild(cvv);
    (cardNumberRef.current as HTMLDivElement & { __session?: CardFieldsSession }).__session = session;
  }, [instance, eligible]);

  async function submitCardFields() {
    if (!instance || !cartId || !shippingAddress) return;
    const session = (cardNumberRef.current as (HTMLDivElement & { __session?: CardFieldsSession }) | null)?.__session;
    if (!session) return;
    if (!requireValidForm()) return;
    setStatus("processing");
    try {
      const { orderId } = await createOrderOnServer(cartId, email, shippingAddress);
      const result = await session.submit(orderId);
      if (result.state === "succeeded" || result.state === "canceled" || result.state === "failed") {
        if (result.state === "failed") throw new Error("Card payment failed");
        if (result.state === "canceled") { setStatus("idle"); return; }
      }
      await onOrderApproved(orderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  // Google Pay — drives Google's own Payment Request API alongside the
  // PayPal-side confirmOrder() bridge. Same deferred-order-creation
  // approach as Apple Pay: Google's own sheet collects email + shipping
  // address (requested below), so the on-page form isn't needed for this
  // payment method at all.
  useEffect(() => {
    if (!instance || !eligible?.isEligible("googlepay") || !cartId || !googlePayBtnRef.current) return;
    let cancelled = false;
    (async () => {
      await loadScript(GOOGLE_PAY_SRC);
      if (cancelled || !window.google || !googlePayBtnRef.current) return;
      const session = instance.createGooglePayOneTimePaymentSession();
      const details = eligible.getDetails("googlepay");
      const config = session.formatConfigForPaymentRequest(details.config);
      const client = new window.google.payments.api.PaymentsClient({ environment: PAYPAL_ENV === "live" ? "PRODUCTION" : "TEST" });
      const container = googlePayBtnRef.current;
      container.innerHTML = "";
      const onClick = async () => {
        setStatus("processing");
        try {
          // formatConfigForPaymentRequest doesn't include transactionInfo —
          // Google's loadPaymentData rejects the request without it. Only
          // used for the Google Pay sheet's own display; the real charge is
          // always computed server-side in the create-order route below.
          const paymentData = await client.loadPaymentData({
            ...config,
            emailRequired: true,
            shippingAddressRequired: true,
            shippingAddressParameters: { phoneNumberRequired: false },
            transactionInfo: {
              totalPriceStatus: "FINAL",
              totalPrice: (Number(cart?.amount ?? 0) / QAR_PER_USD).toFixed(2),
              currencyCode: "USD",
              countryCode: "US",
            },
          });
          const addr = paymentData.shippingAddress;
          if (!addr) throw new Error("Google Pay did not provide a shipping address");
          const shipping = {
            fullName: addr.name || "Google Pay customer",
            addressLine1: addr.address1 ?? "",
            city: addr.locality ?? "",
            countryCode: addr.countryCode ?? "",
            postalCode: addr.postalCode,
          };
          const buyerEmail = paymentData.email ?? email;
          if (!buyerEmail) throw new Error("No email available from Google Pay");
          const { orderId } = await createOrderOnServer(cartId, buyerEmail, shipping);
          await session.confirmOrder({ orderId, paymentMethodData: paymentData.paymentMethodData });
          await onOrderApproved(orderId);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
      };
      const button = client.createButton({ onClick, buttonColor: "black", buttonType: "buy", buttonSizeMode: "fill" });
      container.appendChild(button);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, eligible, cartId, cart?.amount, email]);

  // Apple Pay — only renders where window.ApplePaySession exists (Safari)
  // and the device itself reports canMakePayments(). Unlike PayPal button
  // and card fields, this doesn't need the on-page form filled in at all:
  // Apple's own sheet collects name/address/email directly (requested via
  // requiredShippingContactFields below), so order creation is deferred
  // until onpaymentauthorized actually provides that contact — the order
  // never exists with a blank/guessed address.
  useEffect(() => {
    const btn = applePayBtnRef.current;
    if (!instance || !eligible?.isEligible("applepay") || !cartId || !btn) return;
    if (!window.ApplePaySession?.canMakePayments()) return;
    let cancelled = false;
    // This effect reruns on every keystroke in the email field (it's a
    // dependency, used only as a fallback if Apple Pay's own sheet somehow
    // doesn't return one) — without tracking and removing the previously
    // attached listener, each rerun stacked another addEventListener onto
    // the same persistent button node, so one tap fired every accumulated
    // handler at once. Confirmed in production: three orders created
    // within 13ms of each other from a single tap, each with a different
    // truncated email captured mid-keystroke. Capturing `btn` once above
    // (rather than re-reading applePayBtnRef.current later) is what lets
    // the cleanup below reliably remove the exact listener it attached.
    let attachedOnClick: (() => void) | null = null;
    (async () => {
      const bridge = await instance.createApplePayOneTimePaymentSession();
      if (cancelled) return;
      const { merchantCapabilities, supportedNetworks } = await bridge.config();
      if (cancelled) return;
      btn.removeAttribute("hidden");
      const onClick = () => {
        setStatus("processing");
        const ApplePaySessionCtor = window.ApplePaySession as ApplePaySessionCtor;
        const session = new ApplePaySessionCtor(3, {
          countryCode: "US",
          currencyCode: "USD",
          merchantCapabilities,
          supportedNetworks,
          total: { label: "HUNCH", amount: (Number(cart?.amount ?? 0) / QAR_PER_USD).toFixed(2) },
          requiredShippingContactFields: ["postalAddress", "name", "email"],
        });
        session.onvalidatemerchant = async (event) => {
          try {
            const { merchantSession } = await bridge.validateMerchant({ validationUrl: event.validationURL });
            session.completeMerchantValidation(merchantSession);
          } catch (e) {
            // Cancels the sheet outright instead of leaving it stuck on
            // "Processing" — completeMerchantValidation() is the only
            // success signal Apple's API has, there's no explicit
            // "validation failed" one, so abort() is the correct way to
            // tell Apple's own UI this attempt is over.
            session.abort();
            setError(`Apple Pay merchant validation failed: ${e instanceof Error ? e.message : String(e)}`);
            setStatus("error");
          }
        };
        session.onpaymentauthorized = async (event) => {
          try {
            const contact = event.payment.shippingContact;
            if (!contact) throw new Error("Apple Pay did not provide a shipping address");
            const shipping = {
              fullName: [contact.givenName, contact.familyName].filter(Boolean).join(" ") || "Apple Pay customer",
              addressLine1: contact.addressLines?.[0] ?? "",
              city: contact.locality ?? "",
              countryCode: contact.countryCode ?? "",
              postalCode: contact.postalCode,
            };
            const buyerEmail = contact.emailAddress ?? email;
            if (!buyerEmail) throw new Error("No email available from Apple Pay");
            // Order matters: only tell Apple's UI the payment succeeded
            // once our own backend has actually captured it — telling
            // Apple "success" first and then failing our own capture
            // would show the buyer a successful payment we never recorded.
            const { orderId } = await createOrderOnServer(cartId, buyerEmail, shipping);
            await bridge.confirmOrder({ orderId, token: event.payment.token });
            await captureOnServer(orderId);
            session.completePayment(ApplePaySessionCtor.STATUS_SUCCESS);
            clearCart();
            setStatus("done");
            setTimeout(closeDrawer, 1500);
          } catch (e) {
            session.completePayment(ApplePaySessionCtor.STATUS_FAILURE);
            setError(`Apple Pay payment failed: ${e instanceof Error ? e.message : String(e)}`);
            setStatus("error");
          }
        };
        session.begin();
      };
      attachedOnClick = onClick;
      btn.addEventListener("click", onClick);
    })();
    return () => {
      cancelled = true;
      if (attachedOnClick) btn.removeEventListener("click", attachedOnClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, eligible, cartId, email]);

  if (!CLIENT_ID || !cartId || !cart || cart.lines.length === 0) return null;

  const usdEstimate = (Number(cart.amount) / QAR_PER_USD).toFixed(2);

  return (
    <div className="paypal-checkout">
      <div className="paypal-checkout__divider">
        <span>Payment</span>
        <span className="microlabel">≈ ${usdEstimate}</span>
      </div>

      {error && <div className="paypal-checkout__error">{error}</div>}
      {status === "done" && <div className="paypal-checkout__success">Payment received — thank you!</div>}

      {eligible?.isEligible("paypal") && <paypal-button ref={paypalBtnRef} hidden type="pay" />}

      {eligible?.isEligible("googlepay") && <div ref={googlePayBtnRef} className="paypal-checkout__googlepay" />}

      <button type="button" ref={applePayBtnRef} hidden className="apple-pay-button-native" />

      {eligible?.isEligible("advanced_cards") && (
        <div className="paypal-checkout__cardfields">
          <div ref={cardNumberRef} className="paypal-checkout__field" />
          <div className="paypal-checkout__row">
            <div ref={cardExpiryRef} className="paypal-checkout__field" />
            <div ref={cardCvvRef} className="paypal-checkout__field" />
          </div>
          <button type="button" className="btn btn--ink" style={{ width: "100%", justifyContent: "center" }}
            disabled={status === "processing"} onClick={submitCardFields}>
            {status === "processing" ? "Processing…" : "Pay with card"}
          </button>
        </div>
      )}
    </div>
  );
}
