/* Which products can be personalised, and in which competitions.
   Two gates, both required:
     1. The product itself opts in — jersey-family, customizable=true, with a
        kit_type (set per product in /admin/products).
     2. A calibrated print entry exists in Supabase (photo geometry +
        lettering) for that team + kit type — resolved via printFor().
   Retro/special-edition jerseys personalise exactly like home/away once
   their own calibration row exists (kit_type 'retro' | 'special'). */
import { printFor, printSlot, type CompetitionId, type PrintEntry, type KitTypeId } from "./catalog";
import type { Product } from "./products";

export interface PersonalizationInfo {
  /** Competitions with a calibrated back-photo print pipeline, in display order */
  competitions: CompetitionId[];
}

export function personalizationFor(
  product: Product,
  printMap: Partial<Record<string, PrintEntry>>,
): PersonalizationInfo | null {
  if (product.status !== "available") return null;
  if (product.productType !== "jersey") return null;
  if (!product.customizable || product.kitType == null || !product.teamSlug) return null;

  const entry = printMap[product.teamSlug];
  if (!entry?.images) return null;
  const kitType = product.kitType as KitTypeId;

  // Every image slot belonging to THIS kit type — home keeps the bare
  // competition id, everything else is suffixed (see printSlot).
  const suffix = kitType === "home" ? null : `__${kitType}`;
  const competitions = (Object.keys(entry.images) as string[])
    .filter((slot) => (suffix ? slot.endsWith(suffix) : !slot.includes("__")))
    .map((slot) => (suffix ? slot.slice(0, -suffix.length) : slot) as CompetitionId)
    .filter((comp) => printFor(product.teamSlug as never, comp, "back", printMap, kitType) !== null)
    // League(s) first, continental last, for a stable studio segment order
    .sort((a, b) => (a === "ucl" ? 1 : 0) - (b === "ucl" ? 1 : 0));

  return competitions.length ? { competitions } : null;
}

// Re-exported so callers don't need a second import just for slotting.
export { printSlot };
