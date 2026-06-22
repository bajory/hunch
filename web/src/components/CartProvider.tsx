"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { isShopifyConfigured, createCart, addLine, type CartAttribute, type CartState } from "@/lib/shopify";

export interface CartItem {
  id: string;
  attributes: CartAttribute[];
}

interface CartContextValue {
  count: number;
  items: CartItem[];
  checkoutUrl: string | null;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
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
  const [items, setItems] = useState<CartItem[]>([]);
  const [cart, setCart] = useState<CartState | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    // future: rehydrate saved cart id from localStorage
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

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
      // Local fallback: store items so the drawer can display them
      const newItem: CartItem = { id: crypto.randomUUID(), attributes };
      setItems((prev) => [...prev, newItem]);
      setCount((n) => n + 1);
    },
    [cart],
  );

  return (
    <CartContext.Provider
      value={{ count, items, checkoutUrl: cart?.checkoutUrl ?? null, drawerOpen, openDrawer, closeDrawer, addItem }}
    >
      {children}
    </CartContext.Provider>
  );
}
