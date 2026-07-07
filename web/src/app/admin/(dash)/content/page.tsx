import type { Metadata } from "next";
import { getSiteContentFresh } from "@/lib/site-content";
import { ContentEditor } from "../../ContentEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Homepage Content — HUNCH Admin" };

export default async function ContentPage() {
  const content = await getSiteContentFresh();
  return <ContentEditor content={content} />;
}
