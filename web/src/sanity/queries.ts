import { sanityClient, isSanityConfigured } from "./client";
import type { CompetitionId, TeamId, Competition, Team, PrintEntry } from "@/lib/catalog";

/* ---- raw Sanity document shapes (GROQ projects slug.current → string) ---- */

interface SanityCompetition {
  _id: string;
  slug: string;
  label: string;
  kind: "league" | "continental";
  fontFamily?: string;
  nameWeight?: number;
  numberWeight?: number;
  tracking?: string;
  uppercase?: boolean;
}

interface SanityClub {
  _id: string;
  slug: string;
  name: string;
  edition?: string;
  price?: number;
  shopifyProductId?: string;
  league: SanityCompetition | null;
  kitColours?: {
    body?: string;
    leagueFill?: string;
    uclFill?: string;
    leagueStroke?: string;
  };
  roster?: Array<{ name: string; number: number }>;
  print?: {
    nameCy?: number;
    nameSpan?: number;
    nameArc?: number;
    nameSize?: number;
    numberCy?: number;
    numberSize?: number;
  };
  photos?: Array<{
    competition: SanityCompetition | null;
    view: "front" | "back";
    image?: { asset?: { url?: string } };
    shopifyVariantId?: string;
  }>;
}

/* ---- GROQ queries ---- */

const COMPETITION_FIELDS = `
  _id,
  "slug": slug.current,
  label,
  kind,
  fontFamily,
  nameWeight,
  numberWeight,
  tracking,
  uppercase
`;

const CLUB_FIELDS = `
  _id,
  "slug": slug.current,
  name,
  edition,
  price,
  shopifyProductId,
  league -> { ${COMPETITION_FIELDS} },
  kitColours,
  roster,
  print,
  photos[] {
    competition -> { ${COMPETITION_FIELDS} },
    view,
    image { asset -> { url } },
    shopifyVariantId
  }
`;

export async function fetchCompetitions(): Promise<SanityCompetition[]> {
  if (!isSanityConfigured() || !sanityClient) return [];
  return sanityClient.fetch<SanityCompetition[]>(
    `*[_type == "competition"] | order(label asc) { ${COMPETITION_FIELDS} }`
  );
}

export async function fetchClubs(): Promise<SanityClub[]> {
  if (!isSanityConfigured() || !sanityClient) return [];
  return sanityClient.fetch<SanityClub[]>(
    `*[_type == "club"] | order(name asc) { ${CLUB_FIELDS} }`
  );
}

/* ---- mappers: Sanity → catalog types ---- */

export function mapCompetition(s: SanityCompetition): Competition {
  const id = s.slug as CompetitionId;
  return {
    id,
    label: s.label,
    kind: s.kind,
    patch: id,
    fontFamily: s.fontFamily ?? "sans-serif",
    nameWeight: s.nameWeight ?? 600,
    numberWeight: s.numberWeight ?? 700,
    tracking: s.tracking ?? "0.05em",
    uppercase: s.uppercase ?? true,
  };
}

export function mapClub(s: SanityClub): { team: Team; print: PrintEntry } {
  const id = s.slug as TeamId;
  const leagueId = ((s.league?.slug) ?? "ucl") as CompetitionId;
  const colours = s.kitColours ?? {};

  const team: Team = {
    id,
    name: s.name,
    edition: s.edition ?? "",
    league: leagueId,
    price: s.price ?? 160,
    kit: {
      body: colours.body ?? "#FFFFFF",
      bodyShade: colours.body ?? "#E8E8E8",
      collar: "#000000",
      accent: "#FFFFFF",
      leagueFill: colours.leagueFill ?? "#FFFFFF",
      leagueStroke: colours.leagueStroke ?? "none",
      uclFill: colours.uclFill ?? "#FFFFFF",
      crestText: "",
      crestBg: "#FFFFFF",
      crestFg: "#000000",
      sponsor: "",
      stripes: null,
    },
    roster: s.roster ?? [],
  };

  const print: PrintEntry = {
    name: s.print
      ? {
          cy: s.print.nameCy ?? 0.34,
          span: s.print.nameSpan ?? 0.42,
          arc: s.print.nameArc ?? 0.045,
          size: s.print.nameSize ?? 0.052,
        }
      : undefined,
    number: s.print
      ? {
          cy: s.print.numberCy ?? 0.52,
          size: s.print.numberSize ?? 0.26,
        }
      : undefined,
    images: s.photos?.reduce(
      (acc, p) => {
        if (!p.competition?.slug || !p.image?.asset?.url) return acc;
        const cid = p.competition.slug as CompetitionId;
        if (!acc[cid]) acc[cid] = { back: "", front: "" };
        acc[cid]![p.view] = p.image.asset.url;
        return acc;
      },
      {} as NonNullable<PrintEntry["images"]>
    ),
  };

  return { team, print };
}
