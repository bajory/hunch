/* =========================================================================
   Sanity content model for the HUNCH catalog.
   -------------------------------------------------------------------------
   These definitions describe the documents an editor manages in Sanity Studio
   (club, competition, kit/product). They mirror the typed catalog in
   src/lib/catalog.ts so the CMS can become the source of truth with no shape
   change. Wire them into a Studio (sanity.config.ts) when the project exists.
   ========================================================================= */

export const competitionSchema = {
  name: "competition",
  title: "Competition",
  type: "document",
  fields: [
    { name: "label", title: "Label", type: "string" },
    { name: "slug", title: "ID (slug)", type: "slug", options: { source: "label" } },
    { name: "kind", title: "Kind", type: "string", options: { list: ["league", "continental"] } },
    { name: "fontFamily", title: "Lettering font (CSS family)", type: "string" },
    { name: "nameWeight", title: "Name weight", type: "number" },
    { name: "numberWeight", title: "Number weight", type: "number" },
    { name: "tracking", title: "Tracking (em)", type: "string" },
    { name: "uppercase", title: "Uppercase", type: "boolean" },
    { name: "patch", title: "Sleeve patch", type: "image" },
  ],
};

export const printGeometry = {
  name: "printGeometry",
  title: "Print geometry",
  type: "object",
  fields: [
    { name: "nameCy", type: "number", title: "Name centre Y (0–1)" },
    { name: "nameSpan", type: "number", title: "Name width (0–1)" },
    { name: "nameArc", type: "number", title: "Name arch (0–1)" },
    { name: "nameSize", type: "number", title: "Name size (0–1 of width)" },
    { name: "numberCy", type: "number", title: "Number centre Y (0–1)" },
    { name: "numberSize", type: "number", title: "Number size (0–1 of width)" },
  ],
};

export const clubSchema = {
  name: "club",
  title: "Club",
  type: "document",
  fields: [
    { name: "name", title: "Name", type: "string" },
    { name: "slug", title: "ID (slug)", type: "slug", options: { source: "name" } },
    { name: "edition", title: "Edition", type: "string" },
    { name: "league", title: "Domestic competition", type: "reference", to: [{ type: "competition" }] },
    { name: "price", title: "Base price", type: "number" },
    { name: "shopifyProductId", title: "Shopify product id", type: "string" },
    { name: "kitColours", title: "Kit colours", type: "object", fields: [
      { name: "body", type: "string" }, { name: "leagueFill", type: "string" },
      { name: "uclFill", type: "string" }, { name: "leagueStroke", type: "string" },
    ] },
    { name: "letteringFont", title: "Official lettering font override", type: "string" },
    { name: "roster", title: "Roster", type: "array", of: [{ type: "object", fields: [
      { name: "name", type: "string" }, { name: "number", type: "number" },
    ] }] },
    { name: "print", title: "Print geometry", type: "printGeometry" },
    { name: "photos", title: "Kit photos (per competition / view)", type: "array", of: [{ type: "object", fields: [
      { name: "competition", type: "reference", to: [{ type: "competition" }] },
      { name: "view", type: "string", options: { list: ["front", "back"] } },
      { name: "image", type: "image" },
      { name: "shopifyVariantId", type: "string" },
    ] }] },
  ],
};

export const schemaTypes = [competitionSchema, printGeometry, clubSchema];
