import { createClient, type SanityClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

export function isSanityConfigured(): boolean {
  return Boolean(projectId);
}

export const sanityClient: SanityClient | null = projectId
  ? createClient({ projectId, dataset, apiVersion: "2025-01-01", useCdn: true })
  : null;
