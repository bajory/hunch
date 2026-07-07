import { CartProvider } from "@/components/CartProvider";
import { Nav } from "@/components/Nav";
import { CartDrawer } from "@/components/CartDrawer";
import { Footer } from "@/components/Footer";
import { CursorProvider } from "@/components/motion/CursorProvider";
import { PageTransition } from "@/components/motion/PageTransition";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <CursorProvider />
      <Nav />
      <PageTransition>{children}</PageTransition>
      <CartDrawer />
      <Footer />
    </CartProvider>
  );
}
