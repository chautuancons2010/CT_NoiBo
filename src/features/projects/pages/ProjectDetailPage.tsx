import { notFound } from "next/navigation";

import { projectDetailSections } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";
import { Tabs } from "@/components/shared/Tabs";

export interface ProjectDetailPageProps {
  projectId: string;
  section: string;
}

export function ProjectDetailPage({ projectId, section }: ProjectDetailPageProps) {
  const currentSection = projectDetailSections.find((item) => item.value === section);

  if (!currentSection) {
    notFound();
  }

  return (
    <div className="page-stack">
      <Tabs
        items={projectDetailSections.map((item) => ({
          label: item.label,
          href: `/projects/${projectId}/${item.value}`,
          active: item.value === section
        }))}
        label="Tab dự án"
      />
      <PlaceholderPage
        description="Trang chi tiết dự án/công trường dùng route-backed tabs, không dùng state để thay router."
        moduleName={`Dự án ${projectId} · ${currentSection.label}`}
        title={`${currentSection.label} dự án ${projectId}`}
      />
    </div>
  );
}
