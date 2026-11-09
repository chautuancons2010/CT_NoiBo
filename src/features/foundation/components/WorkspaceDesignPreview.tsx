"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppRail } from "@/components/layout/AppRail";
import { CurrentUserProvider } from "@/components/providers/CurrentUserProvider";
import { MobileNavigationProvider } from "@/components/layout/MobileNavigationContext";
import { DashboardShell, DashboardView } from "@/features/dashboard/components/DashboardView";
import type { DashboardReadModel } from "@/features/dashboard/types";
import { allFoundationPermissions, type AuthenticatedUser } from "@/lib/auth/permissions";
import { ErpDesignReference } from "./ErpDesignReference";
import { ProjectPortfolioWorkspace } from "@/features/projects/components/ProjectPortfolioWorkspace";
import type { ProjectSummary } from "@/features/projects/types/projectTypes";
import { EmployeeListTable } from "@/features/employees/components/EmployeeListTable";
import type { EmployeeSummary } from "@/features/employees/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { ListWorkspace } from "@/components/shared/PageLayouts";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput, Select } from "@/components/shared/FormControls";
import { Button } from "@/components/shared/Button";
import { Plus } from "lucide-react";
import chrome from "@/components/layout/ApplicationChrome.module.css";

// Development fixtures only. The route is unavailable in production and does
// not replace authentication or supply data to any business route.
const user: AuthenticatedUser = {
  id: "interface-preview", displayName: "Châu Tuấn", username: "interface.preview",
  email: "preview@example.invalid", status: "active", permissions: allFoundationPermissions
};
const model: DashboardReadModel = {
  profile: "management", profileLabel: "Dữ liệu mẫu", generatedAt: "2026-11-05T03:00:00Z",
  widgets: [{ key: "attendance_overview", label: "Dữ liệu mẫu", status: "ready", data: {
    metrics: [
      { label: "Nhân sự có mặt", value: 128, href: "/attendance/today" },
      { label: "Công trường hoạt động", value: 12, href: "/projects" },
      { label: "Hồ sơ chờ duyệt", value: 7, tone: "warning", href: "/approvals" },
      { label: "Hoàn thành trung bình", value: "76%", tone: "success" },
      { label: "Vấn đề cần xử lý", value: 3, tone: "error", href: "/projects" }
    ],
    charts: [
      { key: "hr-by-department", title: "Nhân sự theo phòng ban", kind: "bar", unit: "nhân viên", series: [{ label: "Kỹ thuật", value: 42 }, { label: "Công trường", value: 56 }, { label: "Văn phòng", value: 18 }, { label: "Kho vận", value: 12 }] },
      { key: "project-progress", title: "Tiến độ công trường", kind: "bar", unit: "%", series: [{ label: "Bảo trì hệ thống ray", value: 86 }, { label: "Lắp đặt kết cấu thép", value: 72 }, { label: "Cải tạo nhà xưởng", value: 54 }] }
    ]
  } }],
  attention: [
    { id: "preview-1", type: "approval", title: "Đề nghị nghỉ phép · Nguyễn Minh An", context: "Kỹ thuật · 06/11/2026", dueOrAge: "Hôm nay", priority: "HIGH", href: "/approvals" },
    { id: "preview-2", type: "project_issue", title: "Nghiệm thu kết cấu khu vực B", context: "Công trường CT-012", dueOrAge: "Hôm nay", priority: "HIGH", href: "/projects" },
    { id: "preview-3", type: "shipment", title: "LH-2026-018", context: "Vật tư bảo trì · Cảng ABC", dueOrAge: "Ngày mai", priority: "LOW", href: "/import-export/shipments" },
    { id: "preview-4", type: "timesheet", title: "Đối soát bảng công tháng 10", context: "Phòng kỹ thuật · 42 nhân viên", dueOrAge: "2 ngày", priority: "LOW", href: "/timesheets" }
  ]
};

const projects: ProjectSummary[] = [
  { id: "sample-ct01", code: "CT-2026-018", name: "Bảo trì hệ thống ray Cảng ABC", customerName: "Công ty Cảng ABC", startDate: "2026-08-01", expectedEndDate: "2026-11-28", status: "active", health: "on_track", projectManagerName: "Nguyễn Minh An", currentPeople: 24, worksiteCount: 3, rowVersion: 1 },
  { id: "sample-ct02", code: "CT-2026-019", name: "Lắp đặt kết cấu thép nhà xưởng B2", customerName: "Công ty Hưng Thịnh", startDate: "2026-09-15", expectedEndDate: "2026-11-03", status: "active", health: "delayed", projectManagerName: "Trần Quốc Minh", currentPeople: 18, worksiteCount: 2, rowVersion: 1 },
  { id: "sample-ct03", code: "CT-2026-020", name: "Cải tạo hệ thống điện khu công nghiệp", customerName: "KCN Long Thành", startDate: "2026-10-01", expectedEndDate: "2026-12-15", status: "active", health: "on_track", projectManagerName: "Lê Quốc Bình", currentPeople: 32, worksiteCount: 4, rowVersion: 1 },
  { id: "sample-ct04", code: "CT-2026-021", name: "Thi công hệ thống PCCC kho trung tâm", customerName: "Công ty Minh Phát", startDate: "2026-11-01", expectedEndDate: "2027-01-20", status: "preparing", health: "on_track", projectManagerName: "Phạm Anh Tuấn", currentPeople: 12, worksiteCount: 1, rowVersion: 1 },
  { id: "sample-ct05", code: "CT-2026-015", name: "Nâng cấp đường ray bến số 5", customerName: "Công ty Cảng ABC", startDate: "2026-06-01", expectedEndDate: "2026-10-30", actualEndDate: "2026-10-28", status: "completed", health: "completed", projectManagerName: "Nguyễn Minh An", currentPeople: 0, worksiteCount: 2, rowVersion: 1 },
  { id: "sample-ct06", code: "CT-2026-022", name: "Bảo dưỡng thiết bị nâng khu A", customerName: "Công ty Hưng Thịnh", startDate: "2026-11-10", expectedEndDate: "2027-02-12", status: "preparing", health: "on_track", currentPeople: 0, worksiteCount: 1, rowVersion: 1 }
];
const employees: EmployeeSummary[] = [
  ["Nguyễn Minh An", "Kỹ thuật", "Trưởng phòng", "office"],
  ["Trần Thu Hà", "Nhân sự", "Chuyên viên", "office"],
  ["Lê Quốc Bình", "Công trường", "Giám sát trưởng", "field"],
  ["Phạm Anh Tuấn", "Kỹ thuật", "Kỹ sư cơ khí", "field"],
  ["Nguyễn Thị Mai", "Kế toán", "Kế toán tổng hợp", "office"],
  ["Trần Quốc Minh", "Công trường", "Chỉ huy trưởng", "field"],
  ["Võ Hoàng Nam", "Kho vận", "Thủ kho", "office"],
  ["Đặng Thanh Hương", "Nhân sự", "Chuyên viên", "office"]
].map<EmployeeSummary>(([name, department, position, category], index) => ({
  id: `sample-nv-${index}`, employeeCode: `NV00${index + 1}`, fullName: name,
  displayName: name, departmentName: department, positionName: position,
  employmentTypeName: index === 7 ? "Thử việc" : "Chính thức", workerCategory: category === "field" ? "engineer" : "office",
  phone: `0901 234 56${index}`, companyEmail: `sample${index + 1}@example.invalid`, joinDate: "2025-04-01",
  employmentStatus: "active", employmentStatusLabel: "Đang làm việc", employmentStatusTone: "success",
  profileStatus: "complete", profileCompleteness: 100, hasAccount: true
}));

function EmployeePreview() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const rows = employees.filter((person) => (!department || person.departmentName === department) && `${person.fullName} ${person.employeeCode}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));
  return <div className="page-stack">
    <PageHeader title="Nhân viên" meta={`${rows.length} hồ sơ`} action={<Button leftIcon={<Plus aria-hidden="true" size={17} />} variant="primary">Thêm nhân viên</Button>} />
    <ListWorkspace label="Danh sách mẫu" filters={<FilterBar><SearchInput label="Tìm nhân viên" placeholder="Tìm theo tên, mã nhân viên" value={query} onChange={(event) => setQuery(event.target.value)} /><Select label="Phòng ban" labelHidden placeholder="Tất cả phòng ban" value={department} onChange={(event) => setDepartment(event.target.value)} options={[...new Set(employees.map((person) => person.departmentName))].map((name) => ({ label: name, value: name }))} /></FilterBar>} footer={<footer className="pagination"><span>1–{rows.length} / {rows.length} nhân viên</span><span>Trang 1</span></footer>}><EmployeeListTable employees={rows} permissions={user.permissions} /></ListWorkspace>
  </div>;
}

export function WorkspaceDesignPreview({ screen = "dashboard" }: { screen?: "dashboard" | "reference" | "projects" | "employees" }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = screen === "projects" ? "/projects" : screen === "reference" || screen === "employees" ? "/employees" : "/dashboard";
  return <CurrentUserProvider user={user}><MobileNavigationProvider>
    <div className={`app-shell ${chrome.shell}`} data-navigation-collapsed={collapsed}>
      <AppRail pathname={pathname} user={user} collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <div className={`app-content ${chrome.content}`}>
        <AppHeader pathname={pathname} user={user} connectionState="connected" documentTitleOverride="Mẫu giao diện · Dữ liệu mẫu" homeHref="/dashboard" sidebarCollapsed={collapsed} onSidebarToggle={() => setCollapsed(!collapsed)} />
        <main className={`page-main ${chrome.main}`} id="main-content">
          {screen === "reference" ? <ErpDesignReference /> : screen === "projects" ? <div className="page-stack"><PageHeader title="Gói / Công trường" meta={`${projects.length} gói`} action={<Button leftIcon={<Plus aria-hidden="true" size={17} />} variant="primary">Tạo gói</Button>} /><ProjectPortfolioWorkspace canCreate initialProjects={projects} /></div> : screen === "employees" ? <EmployeePreview /> : <DashboardShell><DashboardView initialModel={model} /></DashboardShell>}
        </main>
      </div>
    </div>
  </MobileNavigationProvider></CurrentUserProvider>;
}
