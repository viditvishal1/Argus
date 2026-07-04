import { ModuleView } from "@/components/ModuleView";

export const metadata = { title: "News Intelligence — EarthOS" };

export default function NewsPage() {
  return (
    <ModuleView
      module="news"
      title="News Intelligence"
      subtitle="Direct outlet feeds with in-app article extraction — read without leaving EarthOS"
      refreshSeconds={300}
    />
  );
}
