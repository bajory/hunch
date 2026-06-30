import { notFound } from "next/navigation";
import { Configurator } from "@/components/Configurator";
import { getCatalog } from "@/lib/cms";
import { type TeamId } from "@/lib/catalog";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ team: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { team } = await params;
  const { teams } = await getCatalog();
  const t = teams[team as TeamId];
  if (!t) return { title: "Jersey — HUNCH" };
  return {
    title: `${t.name} Jersey — HUNCH`,
    description: `Customise the authentic ${t.name} ${t.edition} match jersey with your name and number, atelier-pressed to your specification.`,
  };
}

export async function generateStaticParams() {
  const { teams } = await getCatalog();
  return Object.keys(teams).map((team) => ({ team }));
}

export default async function JerseyPage({ params }: Props) {
  const { team } = await params;
  const { teams, competitions, print } = await getCatalog();
  if (!(team in teams)) notFound();
  return <Configurator defaultTeam={team as TeamId} teams={teams} competitions={competitions} printMap={print} />;
}
