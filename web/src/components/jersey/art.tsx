/* Jersey artwork: sleeve patches, the SVG silhouette fallback, and the
   name/number overlay used on real photos. Pure (no hooks) → shareable. */
import type { CompetitionId, Competition, Team, View, SleeveGeo } from "@/lib/catalog";

/* pick black/white text that reads on a given kit colour */
export function readable(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#1A1A1A" : "#FFFFFF";
}

/* ---- patch primitives ---- */
function star(cx: number, cy: number, R: number, fill: string, key?: string | number) {
  let pts = "";
  for (let i = 0; i < 5; i++) {
    const ao = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const ai = ao + Math.PI / 5;
    pts += `${cx + R * Math.cos(ao)},${cy + R * Math.sin(ao)} `;
    pts += `${cx + R * 0.42 * Math.cos(ai)},${cy + R * 0.42 * Math.sin(ai)} `;
  }
  return <polygon key={key} points={pts} fill={fill} />;
}

function Starball({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const ring: [number, number][] = [[0, -1], [0.85, -0.5], [0.85, 0.5], [0, 1], [-0.85, 0.5], [-0.85, -0.5]];
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#fff" />
      {star(cx, cy, r * 0.3, "#0A1A4A", "c")}
      {ring.map(([dx, dy], i) => star(cx + dx * r * 0.66, cy + dy * r * 0.66, r * 0.22, "#0A1A4A", i))}
    </>
  );
}

/* inner content for a 40x40 patch box */
export function PatchInner({ competition }: { competition: CompetitionId }) {
  switch (competition) {
    case "ucl":
      return (
        <g>
          <circle cx={20} cy={20} r={18} fill="#0A1A4A" />
          <circle cx={20} cy={20} r={18} fill="none" stroke="#C9A24B" strokeWidth={1} />
          <Starball cx={20} cy={20} r={13} />
        </g>
      );
    case "laliga":
      return (
        <g>
          <rect x={3} y={9} width={34} height={22} rx={4} fill="#0B0B0B" />
          <rect x={3} y={9} width={34} height={22} rx={4} fill="none" stroke="#E4002B" strokeWidth={1.4} />
          <circle cx={13} cy={20} r={4.2} fill="#E4002B" />
          <text x={22} y={24} fontFamily="var(--font-saira), sans-serif" fontWeight={800} fontSize={9} fill="#fff" letterSpacing={0.5}>LIGA</text>
        </g>
      );
    case "premier":
      return (
        <g>
          <circle cx={20} cy={20} r={18} fill="#3D195B" />
          <circle cx={20} cy={20} r={18} fill="none" stroke="#fff" strokeWidth={1} />
          <g transform="translate(13,12)" fill="#fff">
            <path d="M3 11 C3 6 6 3 9 4 C8 6 10 6 11 5 C12 7 11 9 9 10 C11 10 12 12 11 13 C9 12 7 13 6 12 C5 13 3 12 3 11 Z" />
          </g>
        </g>
      );
    case "seriea":
      return (
        <g>
          <rect x={4} y={8} width={32} height={24} rx={6} fill="#003366" />
          <path d="M12 26 L20 12 L28 26 Z" fill="none" stroke="#fff" strokeWidth={2} />
          <circle cx={20} cy={22} r={2.4} fill="#E4002B" />
        </g>
      );
    case "bundesliga":
      return (
        <g>
          <rect x={4} y={10} width={32} height={20} rx={10} fill="#D20515" />
          <text x={20} y={24} textAnchor="middle" fontFamily="var(--font-teko), sans-serif" fontWeight={700} fontSize={12} fill="#fff" letterSpacing={0.5}>BL</text>
        </g>
      );
    default:
      return null;
  }
}

/* small standalone patch icon (control panel preview) */
export function PatchIcon({ competition, imageUrl }: { competition: CompetitionId; imageUrl?: string | null }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={competition + " patch"} className="patch-img" />;
  }
  return (
    <svg viewBox="0 0 40 40">
      <PatchInner competition={competition} />
    </svg>
  );
}

const JERSEY_PATH =
  "M200 36 C182 36 168 41 158 49 L104 74 C82 84 70 104 60 132 L100 162 " +
  "C108 156 117 152 126 150 L126 162 C122 244 120 350 128 430 " +
  "C160 444 240 444 272 430 C280 350 278 244 274 162 L274 150 " +
  "C283 152 292 156 300 162 L340 132 C330 104 318 84 296 74 L242 49 " +
  "C232 41 218 36 200 36 Z";

interface SilhouetteProps {
  team: Team;
  competition: Competition;
  name: string;
  number: string;
  view: View;
  fontFamily: string;
}

/* SVG fallback jersey (used when a club/competition has no photo) */
export function JerseySilhouette({ team, competition, name, number, view, fontFamily }: SilhouetteProps) {
  const k = team.kit;
  const isBack = view === "back";
  const isUCL = competition.kind === "continental";
  const lettering = isUCL ? k.uclFill : k.leagueFill;
  const letterStroke = !isUCL && k.leagueStroke && k.leagueStroke !== "none" ? k.leagueStroke : "none";
  const L = name.length;
  const nameSize = L <= 7 ? 32 : L <= 9 ? 27 : L <= 11 ? 23 : L <= 13 ? 20 : 18;

  const patchX = isBack ? 82 : 318;
  const patchY = 132;

  let stripes: React.ReactNode = null;
  if (k.stripes) {
    const [a, b] = k.stripes.colors, w = k.stripes.width;
    const rects: React.ReactNode[] = [];
    let x = 40, i = 0;
    while (x < 360) { rects.push(<rect key={i} x={x} y={0} width={w} height={470} fill={i % 2 ? b : a} />); x += w; i++; }
    stripes = <g clipPath="url(#bodyclip)">{rects}</g>;
  }

  return (
    <svg viewBox="0 0 400 470" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label={`${team.name} jersey, ${isBack ? "back" : "front"} view`}>
      <defs>
        <clipPath id="bodyclip"><path d={JERSEY_PATH} /></clipPath>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.1} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.18} />
        </linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="16" floodColor="#000" floodOpacity={0.55} />
        </filter>
      </defs>

      <g filter="url(#soft)">
        <path d={JERSEY_PATH} fill={k.body} />
        {stripes}
        <path d={JERSEY_PATH} fill="url(#sheen)" />
        <path d="M158 49 C176 70 224 70 242 49 C232 60 224 66 200 66 C176 66 168 60 158 49 Z" fill={k.collar} />
        <path d="M126 150 C122 244 120 350 128 430" fill="none" stroke="#000" strokeOpacity={0.12} strokeWidth={2} />
        <path d="M274 150 C278 244 280 350 272 430" fill="none" stroke="#000" strokeOpacity={0.12} strokeWidth={2} />

        {isBack ? (
          <g>
            <path id="namearc" d="M96 200 Q200 162 304 200" fill="none" />
            <text textAnchor="middle" fontFamily={fontFamily} fontWeight={competition.nameWeight}
              letterSpacing={competition.tracking} fill={lettering} stroke={letterStroke}
              strokeWidth={letterStroke === "none" ? 0 : 1} style={{ fontSize: `${nameSize}px` }}>
              <textPath href="#namearc" startOffset="50%">{name}</textPath>
            </text>
            <text x={200} y={350} textAnchor="middle" fontFamily={fontFamily} fontWeight={competition.numberWeight}
              letterSpacing="0" fill={lettering} stroke={letterStroke}
              strokeWidth={letterStroke === "none" ? 0 : 0.8} style={{ fontSize: "150px" }}>{number}</text>
          </g>
        ) : (
          <g>
            <g transform="translate(150,150)">
              <rect x={0} y={0} width={34} height={40} rx={3} fill={k.crestBg} />
              <text x={17} y={27} textAnchor="middle" fontFamily="var(--font-cormorant), serif" fontWeight={700} fontSize={17} fill={k.crestFg}>{k.crestText}</text>
            </g>
            <text x={200} y={250} textAnchor="middle" fontFamily="var(--font-montserrat), sans-serif" fontWeight={700} fontSize={15} letterSpacing={2} fill={readable(k.body)} opacity={0.92}>{k.sponsor}</text>
            <text x={248} y={178} textAnchor="middle" fontFamily="var(--font-cormorant), serif" fontWeight={700} fontSize={13} fill={readable(k.body)} opacity={0.55}>HUNCH</text>
          </g>
        )}

        <g transform={`translate(${patchX - 20},${patchY - 20}) scale(1.05)`}>
          <PatchInner competition={competition.patch} />
        </g>
      </g>
    </svg>
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
  return (
    <image href={sleeve.src} x={px} y={py} width={pw} height={ph} preserveAspectRatio="xMidYMid meet" />
  );
}

/* name + number overlay drawn on a real photo (back view) */
export function PhotoOverlay({
  W, H, name, number, fontFamily, nameWeight, numberWeight, tracking, fill, stroke,
  nameGeo, numberGeo, patchImage, patchGeo,
}: {
  W: number; H: number; name: string; number: string;
  fontFamily: string; nameWeight: number; numberWeight: number; tracking: string;
  fill: string; stroke: string;
  nameGeo: { cy: number; span: number; arc: number; size: number };
  numberGeo: { cy: number; size: number };
  patchImage?: string | null;
  patchGeo?: { cx: number; cy: number; size: number }; // fractions of W/H
}) {
  const cx = W / 2;
  const span = nameGeo.span * W, midY = nameGeo.cy * H, rise = nameGeo.arc * H;
  const arc = `M ${cx - span / 2} ${midY} Q ${cx} ${midY - rise} ${cx + span / 2} ${midY}`;
  const nameSize = nameGeo.size * W, numSize = numberGeo.size * W, numY = numberGeo.cy * H;
  const ns = stroke === "none" ? 0 : Math.max(1, nameSize * 0.04);
  const xs = stroke === "none" ? 0 : Math.max(1, numSize * 0.012);
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
      <text x={cx} y={numY} textAnchor="middle" dominantBaseline="central" fontFamily={fontFamily}
        fontWeight={numberWeight} letterSpacing="0" fill={fill} stroke={stroke} strokeWidth={xs}
        paintOrder="stroke" style={{ fontSize: `${numSize}px` }}>{number}</text>
      {patchImage && (
        <image href={patchImage} x={pX} y={pY} width={pSize} height={pSize} preserveAspectRatio="xMidYMid meet" />
      )}
    </>
  );
}
