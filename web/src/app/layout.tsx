import type { Metadata } from "next";
import { fontVariables, resolveTypographyStyle } from "@/lib/fonts";
import { getTypographyFresh } from "@/lib/site-content";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUNCH — The Authentic Atelier",
  description:
    "HUNCH — luxury matchwear, made to your name. Customise authentic jerseys with player or personal lettering and official competition patches.",
};

// Applies the saved theme before first paint (light is the default; only
// "dark" sets an attribute). Inline + blocking on purpose — avoids a flash.
const themeInit = `try{if(localStorage.getItem("hunch-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Uncached, single-row read — the admin's font pick (/admin/content →
  // Typography) applies on the very next request, site-wide (storefront and
  // admin both read the same --font-serif / --font-sans aliases).
  const typography = await getTypographyFresh();
  const typographyStyle = resolveTypographyStyle(typography);

  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <style dangerouslySetInnerHTML={{ __html: typographyStyle }} />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
