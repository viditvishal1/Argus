import { ModuleView } from "@/components/ModuleView";

export const metadata = { title: "Maritime — EarthOS" };

export default function MaritimePage() {
  return (
    <ModuleView
      module="maritime"
      title="Maritime"
      subtitle="AIS vessel positions (add AISHUB_API_KEY in Settings to enable) and shipping signals"
      refreshSeconds={300}
    />
  );
}
