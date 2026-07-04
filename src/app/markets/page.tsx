import { ModuleView } from "@/components/ModuleView";

export const metadata = { title: "Markets — EarthOS" };

export default function MarketsPage() {
  return (
    <ModuleView
      module="markets"
      title="Markets"
      subtitle="Indices & equities (Yahoo Finance), crypto (CoinGecko) — select any instrument for its in-app chart"
      refreshSeconds={180}
    />
  );
}
