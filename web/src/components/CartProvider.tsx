"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { isShopifyConfigured, createCart, addLine, type CartAttribute, type CartState } from "@/lib/shopify";

interface CartContextValue {
  count: number;
  checkoutUrl: string | null;
  /** Add a personalized line. variantId comes from the Shopify product; when
   *  absent or Shopify isn't configured, we fall back to a local count. */
  addItem: (attributes: CartAttribute[], variantId?: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const [cart, setCart] = useState<CartState | null>(null);

  useEffect(() => {
    // (a saved cart id could be rehydrated here once Shopify is live)
  }, []);

  const addItem = useCallback(
    async (attributes: CartAttribute[], variantId?: string) => {
      if (isShopifyConfigured() && variantId) {
        try {
          let c = cart ?? (await createCart());
          if (!cart) {
            setCart(c);
            localStorage.setItem("hunch_cart", c.id);
          }
          c = await addLine(c.id, variantId, attributes);
          setCart(c);
          setCount(c.totalQuantity);
          return;
        } catch (e) {
          console.error("Shopify cart add failed, using local count:", e);
        }
      }
      setCount((n) => n + 1);
    },
    [cart],
  );

  return (
    <CartContext.Provider value={{ count, checkoutUrl: cart?.checkoutUrl ?? null, addItem }}>
      {children}
    </CartContext.Provider>
  );
}
