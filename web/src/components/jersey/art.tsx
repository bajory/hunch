/* Jersey print artwork: the calibrated name/number/patch overlays drawn on
   real shirt photography. Pure (no hooks) → shared by storefront + admin. */
import type { SleeveGeo, NumberGeo, GlyphImage } from "@/lib/catalog";

/* pick black/white text that reads on a given kit colour */
export function readable(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#1A1A1A" : "#FFFFFF";
}

/**
 * Number rendered from per-digit SVG glyphs instead of a font.
 * All digits share the same rendered height, but each keeps its OWN natural
 * aspect ratio (a "1" is narrower than a "0") — using one assumed ratio for
 * every digit is what used to throw multi-digit numbers off-center.
 *
 * Fill tinting uses a three-step SVG filter: (1) desaturate the glyph to strip
 * any baked-in hue (gold, amber, etc.), (2) boost brightness 2× so body pixels
 * (luminance ≥ 0.5) clamp to white, (3) multiply with the admin's target colour.
 * White body → exact target colour. Dark internal artwork (e.g. a club crest
 * baked into the numeral) → a proportionally darker shade, preserving the detail.
 * The result is clipped to the glyph's alpha silhouette.
 * Stroke is a flat colour drawn from a dilated copy of the alpha silhouette.
 */
export function GlyphOverlay({
  W, H, number, glyphs, numberGeo, glyphAspect = 0.65, fill, stroke,
}: {
  W: number; H: number;
  number: string;
  glyphs: Record<string, GlyphImage>;
  numberGeo: NumberGeo;
  /** Fallback ratio for glyphs uploaded before their natural size was recorded */
  glyphAspect?: number;
  fill?: string;
  stroke?: string;
}) {
  const digits = number.replace(/\D/g, "").split("").filter(Boolean);
  if (!digits.length) return null;
  const h = numberGeo.size * W;
  const gap = (numberGeo.gap ?? 0.008) * W;
  const strokeOn = !!stroke && stroke !== "none";
  const strokeW = Math.max(1, h * 0.028);
  const pad = strokeOn ? strokeW * 3 : h * 0.02;

  const widths = digits.map((d) => {
    const g = glyphs[d];
    const ratio = g && g.h > 0 ? g.w / g.h : glyphAspect;
    return h * ratio;
  });
  const totalW = widths.reduce((sum, w) => sum + w, 0) + (digits.length - 1) * gap;
  const startY = numberGeo.cy * H - h / 2;
  const startX = (W - totalW) / 2;
  // Prefix sum of each digit's own width + gap, so layout stays a pure derivation (no mutation during render)
  const offsets = widths.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? startX : acc[i - 1] + widths[i - 1] + gap);
    return acc;
  }, []);

  return (
    <>
      {digits.map((d, i) => {
        const glyph = glyphs[d];
        if (!glyph) return null;
        const x = offsets[i], w = widths[i];
        const id = `gtint-${d}-${i}-${Math.round(numberGeo.cy * 1000)}`;
        const tintId = `${id}-tint`;
        const strokeId = `${id}-stroke`;
        return (
          <g key={i}>
            <defs>
              {/* Desaturate → boost → multiply: strip the glyph's baked-in hue,
                  push body brightness to white (2× clamp), then multiply with
                  the target colour. Body → exact target; dark detail → darker. */}
              {fill && (
                <filter id={tintId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
                  <feColorMatrix type="saturate" values="0" in="SourceGraphic" result="gray" />
                  <feComponentTransfer in="gray" result="norm">
                    <feFuncR type="linear" slope="2" intercept="0" />
                    <feFuncG type="linear" slope="2" intercept="0" />
                    <feFuncB type="linear" slope="2" intercept="0" />
                  </feComponentTransfer>
                  <feFlood floodColor={fill} result="fillColor" />
                  <feBlend in="fillColor" in2="norm" mode="multiply" result="tinted" />
                  <feComposite in="tinted" in2="SourceAlpha" operator="in" />
                </filter>
              )}
              {strokeOn && (
                <filter id={strokeId} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
                  <feMorphology in="SourceAlpha" operator="dilate" radius={strokeW} result="dilated" />
                  <feFlood floodColor={stroke} result="strokeColor" />
                  <feComposite in="strokeColor" in2="dilated" operator="in" />
                </filter>
              )}
            </defs>
            {strokeOn && (
              <image href={glyph.url} x={x - pad} y={startY - pad} width={w + pad * 2} height={h + pad * 2}
                preserveAspectRatio="xMidYMid meet" filter={`url(#${strokeId})`} />
            )}
            <image href={glyph.url} x={x} y={startY} width={w} height={h}
              preserveAspectRatio="xMidYMid meet" filter={fill ? `url(#${tintId})` : undefined} />
          </g>
        );
      })}
    </>
  );
}

/**
 * Sleeve patch overlaid on the jersey photo.
 * Geometry is defined in FRONT-view coordinates; the back view mirrors X automatically.
 * patchW / patchH = natural pixel dimensions of the patch image (for aspect ratio).
 */
export function SleeveOverlay({
  W, H, view, sleeve,
}: {
  W: number; H: number; view: "front" | "back"; sleeve: SleeveGeo;
}) {
  const pw = sleeve.w * W;
  const ph = pw * (sleeve.patchH / sleeve.patchW);
  const py = sleeve.y * H;
  // Same x for front and back — product photos don't flip left/right between views
  const px = sleeve.x * W;
  const rotation = sleeve.rotation ?? 0;
  const cx = px + pw / 2, cy = py + ph / 2;
  return (
    <image href={sleeve.src} x={px} y={py} width={pw} height={ph} preserveAspectRatio="xMidYMid meet"
      transform={rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined} />
  );
}

/* name + number overlay drawn on a real photo (back view) */
export function PhotoOverlay({
  W, H, name, number, fontFamily, numFontFamily, nameWeight, numberWeight, tracking,
  fill, stroke, numFill, numStroke,
  nameGeo, numberGeo, patchImage, patchGeo,
}: {
  W: number; H: number; name: string; number: string;
  fontFamily: string; numFontFamily?: string;
  nameWeight: number; numberWeight: number; tracking: string;
  fill: string; stroke: string;
  numFill?: string; numStroke?: string;
  nameGeo: { cy: number; span: number; arc: number; size: number };
  numberGeo: { cy: number; size: number };
  patchImage?: string | null;
  patchGeo?: { cx: number; cy: number; size: number };
}) {
  const cx = W / 2;
  const span = nameGeo.span * W, midY = nameGeo.cy * H, rise = nameGeo.arc * H;
  const arc = `M ${cx - span / 2} ${midY} Q ${cx} ${midY - rise} ${cx + span / 2} ${midY}`;
  const nameSize = nameGeo.size * W, numSize = numberGeo.size * W, numY = numberGeo.cy * H;
  const resolvedNumFont   = numFontFamily ?? fontFamily;
  const resolvedNumFill   = numFill   ?? fill;
  const resolvedNumStroke = numStroke ?? stroke;
  const ns = stroke === "none" ? 0 : Math.max(1, nameSize * 0.04);
  const xs = resolvedNumStroke === "none" ? 0 : Math.max(1, numSize * 0.012);
  const pg = patchGeo ?? { cx: 0.24, cy: 0.22, size: 0.14 };
  const pSize = pg.size * W;
  const pX = pg.cx * W - pSize / 2;
  const pY = pg.cy * H - pSize / 2;
  return (
    <>
      <path id="ov-arc" d={arc} fill="none" />
      <text textAnchor="middle" fontFamily={fontFamily} fontWeight={nameWeight} letterSpacing={tracking}
        fill={fill} stroke={stroke} strokeWidth={ns} paintOrder="stroke" style={{ fontSize: `${nameSize}px` }}>
        <textPath href="#ov-arc" startOffset="50%">{name}</textPath>
      </text>
      {/* Use fill="currentColor" so COLR font palette layers render correctly.
          The CSS color property sets currentColor without overriding fixed-color COLR layers. */}
      <text x={cx} y={numY} textAnchor="middle" dominantBaseline="central"
        fontFamily={resolvedNumFont} fontWeight={numberWeight} letterSpacing="0"
        fill="currentColor"
        stroke={resolvedNumStroke === "none" ? "none" : resolvedNumStroke}
        strokeWidth={xs} paintOrder="stroke"
        style={{ fontSize: `${numSize}px`, color: resolvedNumFill }}>
        {number}
      </text>
      {patchImage && (
        <image href={patchImage} x={pX} y={pY} width={pSize} height={pSize} preserveAspectRatio="xMidYMid meet" />
      )}
    </>
  );
}
