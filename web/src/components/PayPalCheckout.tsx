"use client";

/* =========================================================================
   Direct PayPal checkout — a shortcut alongside the Shopify "Checkout"
   button in the cart drawer, not a replacement for it. Renders whichever of
   PayPal / Google Pay / Apple Pay / card fields the buyer is actually
   eligible for, via the PayPal JS SDK v6.

   The v6 SDK ships no published TypeScript types, so `window.paypal` and
   its session objects are intentionally loosely typed below — the actual
   safety net is that every call site here is exercised in sandbox testing.

   Confidence levels, so it's clear what to lean on if something misbehaves:
   - PayPal button: closely follows PayPal's own documented example.
   - Card fields: documented mount/submit pattern, no native browser API.
   - Google Pay / Apple Pay: each also drives its own native browser payment
     API (Google's Payment Request API / Safari's window.ApplePaySession) —
     the PayPal-side hooks (confirmOrder, validateMerchant) are wired per
     PayPal's reference, but neither can be exercised end-to-end until their
     external prerequisites (Google Pay & Wallet Console approval; Apple Pay
     domain verification) are done, so treat these two as needing your own
     hands-on testing once that's in place.
   ========================================================================= */

import { useEffect, useRef, useState } from "react";
import type { DetailedHTMLProps, HTMLAttributes } from "react";
import { useCart } from "./CartProvider";

// The PayPal v6 SDK renders these as custom elements — declare them so JSX
// accepts <paypal-button>/<apple-pay-button> as intrinsic tags.
type WebComponentProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { type?: string; buttonstyle?: string };
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required by TS for JSX intrinsic-element augmentation
  namespace JSX {
    interface IntrinsicElements {
      "paypal-button": WebComponentProps;
      "apple-pay-button": WebComponentProps;
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
interface GooglePaymentsClient {
  isReadyToPay(request: unknown): Promise<{ result: boolean }>;
  loadPaymentData(request: unknown): Promise<{ paymentMethodData: unknown }>;
}
interface ApplePaySessionCtor {
  new (version: number, request: unknown): NativeApplePaySession;
  canMakePayments(): boolean;
  STATUS_SUCCESS: number;
  STATUS_FAILURE: number;
}
interface NativeApplePaySession {
  begin(): void;
  completeMerchantValidation(merchantSession: unknown): void;
  completePayment(status: number): void;
  onvalidatemerchant: ((event: { validationURL: string }) => void) | null;
  onpaymentauthorized: ((event: { payment: { token: unknown } }) => void) | null;
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

async function createOrderOnServer(cartId: string): Promise<{ orderId: string }> {
  const res = await fetch("/api/paypal/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartId }),
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

export function PayPalCheckout() {
  const { cart, clearCart, closeDrawer } = useCart();
  const [instance, setInstance] = useState<PayPalSdkInstance | null>(null);
  const [eligible, setEligible] = useState<EligibleMethods | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const paypalBtnRef = useRef<HTMLElement>(null);
  const cardNumberRef = useRef<HTMLDivElement>(null);
  const cardExpiryRef = useRef<HTMLDivElement>(null);
  const cardCvvRef = useRef<HTMLDivElement>(null);
  const googlePayBtnRef = useRef<HTMLDivElement>(null);
  const applePayBtnRef = useRef<HTMLElement>(null);

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
      setStatus("processing");
      void session.start({ presentationMode: "auto" }, createOrderOnServer(cartId));
    };
    btn.addEventListener("click", onClick);
    return () => btn.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, eligible, cartId]);

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
    if (!instance || !cartId) return;
    const session = (cardNumberRef.current as (HTMLDivElement & { __session?: CardFieldsSession }) | null)?.__session;
    if (!session) return;
    setStatus("processing");
    try {
      const { orderId } = await createOrderOnServer(cartId);
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
  // PayPal-side confirmOrder() bridge.
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
      const button = document.createElement("button");
      button.className = "btn btn--line";
      button.type = "button";
      button.textContent = "Google Pay";
      button.onclick = async () => {
        setStatus("processing");
        try {
          const { orderId } = await createOrderOnServer(cartId);
          // formatConfigForPaymentRequest doesn't include transactionInfo —
          // Google's loadPaymentData rejects the request without it. Only
          // used for the Google Pay sheet's own display; the real charge is
          // always computed server-side in the create-order route above.
          const paymentData = await client.loadPaymentData({
            ...config,
            transactionInfo: {
              totalPriceStatus: "FINAL",
              totalPrice: (Number(cart?.amount ?? 0) / QAR_PER_USD).toFixed(2),
              currencyCode: "USD",
              countryCode: "US",
            },
          });
          await session.confirmOrder({ orderId, paymentMethodData: paymentData.paymentMethodData });
          await onOrderApproved(orderId);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
      };
      container.appendChild(button);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, eligible, cartId, cart?.amount]);

  // Apple Pay — only renders where window.ApplePaySession exists (Safari).
  useEffect(() => {
    if (!instance || !eligible?.isEligible("applepay") || !cartId || !applePayBtnRef.current) return;
    if (!window.ApplePaySession?.canMakePayments()) return;
    let cancelled = false;
    (async () => {
      const bridge = await instance.createApplePayOneTimePaymentSession();
      if (cancelled || !applePayBtnRef.current) return;
      const { merchantCapabilities, supportedNetworks } = await bridge.config();
      const btn = applePayBtnRef.current;
      btn.removeAttribute("hidden");
      const onClick = async () => {
        setStatus("processing");
        try {
          const { orderId } = await createOrderOnServer(cartId);
          const ApplePaySessionCtor = window.ApplePaySession as ApplePaySessionCtor;
          const session = new ApplePaySessionCtor(3, {
            countryCode: "US",
            currencyCode: "USD",
            merchantCapabilities,
            supportedNetworks,
            total: { label: "HUNCH", amount: (Number(cart?.amount ?? 0) / QAR_PER_USD).toFixed(2) },
          });
          session.onvalidatemerchant = async (event) => {
            const { merchantSession } = await bridge.validateMerchant({ validationUrl: event.validationURL });
            session.completeMerchantValidation(merchantSession);
          };
          session.onpaymentauthorized = async (event) => {
            await bridge.confirmOrder({ orderId, token: event.payment.token });
            session.completePayment(ApplePaySessionCtor.STATUS_SUCCESS);
            await onOrderApproved(orderId);
          };
          session.begin();
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
      };
      btn.addEventListener("click", onClick);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, eligible, cartId]);

  if (!CLIENT_ID || !cartId || !cart || cart.lines.length === 0) return null;

  const usdEstimate = (Number(cart.amount) / QAR_PER_USD).toFixed(2);

  return (
    <div className="paypal-checkout">
      <div className="paypal-checkout__divider">
        <span>Or pay directly</span>
        <span className="microlabel">≈ ${usdEstimate}</span>
      </div>

      {error && <div className="paypal-checkout__error">{error}</div>}
      {status === "done" && <div className="paypal-checkout__success">Payment received — thank you!</div>}

      {eligible?.isEligible("paypal") && <paypal-button ref={paypalBtnRef} hidden type="pay" />}

      {eligible?.isEligible("googlepay") && <div ref={googlePayBtnRef} />}

      {eligible?.isEligible("applepay") && <apple-pay-button ref={applePayBtnRef} hidden buttonstyle="black" type="buy" />}

      {eligible?.isEligible("advanced_cards") && (
        <div className="paypal-checkout__cardfields">
          <div ref={cardNumberRef} className="paypal-checkout__field" />
          <div className="paypal-checkout__row">
            <div ref={cardExpiryRef} className="paypal-checkout__field" />
            <div ref={cardCvvRef} className="paypal-checkout__field" />
          </div>
          <button type="button" className="btn btn--line" style={{ width: "100%", justifyContent: "center" }}
            disabled={status === "processing"} onClick={submitCardFields}>
            {status === "processing" ? "Processing…" : "Pay with card"}
          </button>
        </div>
      )}
    </div>
  );
}
