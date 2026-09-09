import { notFound } from "next/navigation";

import { employeeDetailSections } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";
import { Tabs } from "@/components/shared/Tabs";

export interface EmployeeDetailPageProps {
  employeeId: string;
  section: string;
}

export function EmployeeDetailPage({ employeeId, section }: EmployeeDetailPageProps) {
  const currentSection = employeeDetailSections.find((item) => item.value === section);

  if (!currentSection) {
    notFound();
  }

  return (
    <div className="page-stack">
      <Tabs
        items={employeeDetailSections.map((item) => ({
          label: item.label,
          href: `/employees/${employeeId}/${item.value}`,
          active: item.value === section
        }))}
        label="Tab hồ sơ nhân viên"
      />
      <PlaceholderPage
        description="Trang chi tiết nhân viên dùng route-backed tabs; nghiệp vụ hồ sơ sẽ triển khai ở prompt Nhân sự."
        moduleName={`Nhân viên ${employeeId} · ${currentSection.label}`}
        title={`${currentSection.label} nhân viên ${employeeId}`}
      />
    </div>
  );
}
