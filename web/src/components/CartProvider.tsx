"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  isShopifyConfigured, createCart, getCart, addLine, updateLineQuantity, removeLine,
  type CartAttribute, type CartState,
} from "@/lib/shopify";

const STORAGE_KEY = "hunch_cart_id";

interface CartContextValue {
  cart: CartState | null;
  count: number;
  checkoutUrl: string | null;
  drawerOpen: boolean;
  loading: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** variantId is required — this is a real Shopify cart line, not a local stub. */
  addItem: (attributes: CartAttribute[], variantId: string) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  /** Drops the local cart reference after a PayPal-path order is captured —
      that payment never touches this Shopify cart, so it must not be
      reused for a future order. A fresh cart is created on the next add. */
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Rehydrate a saved cart on mount so a bag survives a page refresh.
  useEffect(() => {
    if (!isShopifyConfigured()) return;
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) return;
    getCart(savedId)
      .then((c) => { if (c) setCart(c); else localStorage.removeItem(STORAGE_KEY); })
      .catch(() => localStorage.removeItem(STORAGE_KEY));
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const addItem = useCallback(
    async (attributes: CartAttribute[], variantId: string) => {
      if (!isShopifyConfigured()) {
        throw new Error("Checkout isn't configured yet — Shopify credentials are missing.");
      }
      setLoading(true);
      try {
        let c = cart;
        if (!c) {
          c = await createCart();
          localStorage.setItem(STORAGE_KEY, c.id);
        }
        const next = await addLine(c.id, variantId, attributes);
        setCart(next);
      } finally {
        setLoading(false);
      }
    },
    [cart],
  );

  const updateQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cart) return;
      setLoading(true);
      try {
        setCart(await updateLineQuantity(cart.id, lineId, quantity));
      } finally {
        setLoading(false);
      }
    },
    [cart],
  );

  const removeItem = useCallback(
    async (lineId: string) => {
      if (!cart) return;
      setLoading(true);
      try {
        setCart(await removeLine(cart.id, lineId));
      } finally {
        setLoading(false);
      }
    },
    [cart],
  );

  const clearCart = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCart(null);
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        count: cart?.totalQuantity ?? 0,
        checkoutUrl: cart?.checkoutUrl ?? null,
        drawerOpen,
        loading,
        openDrawer,
        closeDrawer,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
