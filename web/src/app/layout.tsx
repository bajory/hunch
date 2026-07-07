import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUNCH — The Authentic Atelier",
  description:
    "HUNCH — luxury matchwear, made to your name. Customise authentic jerseys with player or personal lettering and official competition patches.",
};

// Applies the saved theme before first paint (light is the default; only
// "dark" sets an attribute). Inline + blocking on purpose — avoids a flash.
const themeInit = `try{if(localStorage.getItem("hunch-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fontVariables} suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
