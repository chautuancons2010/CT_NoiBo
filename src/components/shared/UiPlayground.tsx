"use client";

import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { MetricCard } from "@/components/shared/DashboardCards";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Input, Select, Textarea } from "@/components/shared/FormControls";
import { FormSection } from "@/components/shared/FormLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataSurface, PageContainer, Section, SectionHeader } from "@/components/shared/PageLayouts";
import { Skeleton } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";

const tones = ["blue", "mint", "lavender", "orange", "yellow", "cyan", "rose"] as const;
const rows = [
  { id: "1", code: "NV001", name: "Nguyễn Minh Anh", status: "active" },
  { id: "2", code: "NV002", name: "Trần Quốc Bảo", status: "pending" }
];
const columns: DataTableColumn<(typeof rows)[number]>[] = [
  { id: "code", header: "Mã", accessor: "code" },
  { id: "name", header: "Nhân viên", accessor: "name" },
  { id: "status", header: "Trạng thái", cell: (row) => <StatusBadge tone={row.status === "active" ? "success" : "warning"}>{row.status === "active" ? "Hoạt động" : "Chờ xử lý"}</StatusBadge> }
];

export function UiPlayground() {
  return (
    <PageContainer>
      <PageHeader title="UI Playground" />
      <Section>
        <SectionHeader title="Màu và card" />
        <div className="ui-playground-grid">
          {tones.map((tone) => <Card key={tone} variant={tone}><strong>{tone}</strong></Card>)}
        </div>
      </Section>
      <Section>
        <SectionHeader title="KPI pastel" />
        <dl className="dashboard-overview__grid">
          <MetricCard accent="amber"><dt>Chờ xử lý</dt><dd>12</dd><span className="dashboard-overview__note">Kho hàng</span></MetricCard>
          <MetricCard accent="purple"><dt>Dự án</dt><dd>24</dd><span className="dashboard-overview__note">Đang triển khai</span></MetricCard>
          <MetricCard accent="teal"><dt>Chấm công</dt><dd>96%</dd><span className="dashboard-overview__note">Hôm nay</span></MetricCard>
          <MetricCard accent="green"><dt>Nhân sự</dt><dd>186</dd><span className="dashboard-overview__note">Đang làm việc</span></MetricCard>
        </dl>
      </Section>
      <Section>
        <SectionHeader title="Button và trạng thái" />
        <div className="ui-playground-row">
          <Button variant="primary">Primary</Button><Button variant="secondary">Secondary</Button>
          <Button variant="soft">Soft</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button>
          <StatusBadge tone="success">Hoạt động</StatusBadge><StatusBadge tone="warning">Chờ xử lý</StatusBadge>
          <StatusBadge tone="error">Quá hạn</StatusBadge><StatusBadge tone="info">Thông tin</StatusBadge>
        </div>
      </Section>
      <FormSection title="Form">
        <Input label="Tên" placeholder="Nhập tên" />
        <Select label="Trạng thái" options={[{ label: "Đang hoạt động", value: "active" }]} />
        <Textarea label="Ghi chú" />
      </FormSection>
      <DataSurface><header className="data-surface__toolbar"><h2>Data table</h2></header><DataTable columns={columns} data={rows} getRowId={(row) => row.id} /></DataSurface>
      <Section><SectionHeader title="Loading" /><Card><Skeleton /></Card></Section>
    </PageContainer>
  );
}
