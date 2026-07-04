import { GovernmentExtras } from "./search";
import { ModuleView } from "@/components/ModuleView";

export const metadata = { title: "Government & Legal — EarthOS" };

export default function GovernmentPage() {
  return (
    <ModuleView
      module="government"
      title="Government & Legal"
      subtitle="Federal Register rules & notices, recent court opinions, open-data catalog"
      extraHeader={<GovernmentExtras />}
    />
  );
}
