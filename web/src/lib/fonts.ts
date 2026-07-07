import {
  Libre_Caslon_Display,
  Manrope,
  Saira,
  Archivo,
  Oswald,
  Teko,
  Rajdhani,
} from "next/font/google";
import localFont from "next/font/local";

/* Brand display + UI — Gallery Porcelain identity */
export const caslon = Libre_Caslon_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-caslon",
});
export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

/* competition lettering stand-ins */
export const saira = Saira({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-saira" });
export const archivo = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-archivo" });
export const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-oswald" });
export const teko = Teko({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-teko" });
export const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-rajdhani" });

/* official club lettering (self-hosted) */
export const fcbUcl = localFont({
  src: "../fonts/Barcelona-UCL.otf",
  variable: "--font-fcb-ucl",
  display: "swap",
});
export const fcbLiga = localFont({
  src: "../fonts/Barcelona-LaLiga.otf",
  variable: "--font-fcb-liga",
  display: "swap",
});

/* all font CSS-variable classNames, applied once on <body> */
export const fontVariables = [
  caslon, manrope, saira, archivo, oswald, teko, rajdhani, fcbUcl, fcbLiga,
].map((f) => f.variable).join(" ");
