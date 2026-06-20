import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { CartProvider } from "@/components/CartProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUNCH — The Authentic Atelier",
  description:
    "HUNCH — luxury matchwear, made to your name. Customise authentic jerseys with player or personal lettering and official competition patches.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={fontVariables}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
