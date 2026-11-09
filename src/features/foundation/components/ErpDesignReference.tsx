"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader, EntityContextHeader } from "@/components/shared/PageHeader";
import { DataSurface, ListPageLayout, DetailPageLayout, FormPageLayout, ListWorkspace } from "@/components/shared/PageLayouts";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { Input, SearchInput, Select } from "@/components/shared/FormControls";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Tabs } from "@/components/shared/Tabs";
import { FormSection, FormActions } from "@/components/shared/FormLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState, ErrorState, LoadingState, PermissionDeniedState } from "@/components/shared/States";
import { WorkCalendar } from "@/components/shared/WorkCalendar";
import { calendarWeeks } from "@/features/timesheets/services/timesheetPresentation";
import styles from "./ErpDesignReference.module.css";
import { ErpComponentGallery } from "./ErpComponentGallery";

type Screen = "components" | "list" | "detail" | "form" | "calendar";
const people = [
  { id: "NV001", name: "Nguyễn Minh An", department: "Kỹ thuật", position: "Kỹ sư", phone: "0901 234 567", status: "Đang làm việc" },
  { id: "NV002", name: "Trần Thu Hà", department: "Nhân sự", position: "Chuyên viên", phone: "0902 345 678", status: "Đang làm việc" },
  { id: "NV003", name: "Lê Quốc Bình", department: "Công trường", position: "Giám sát", phone: "0903 456 789", status: "Thử việc" }
];
const days = Array.from({ length: 30 }, (_, index) => `2026-11-${String(index + 1).padStart(2, "0")}`);
const screens: { id: Screen; label: string }[] = [{ id: "components", label: "Thành phần" }, { id: "list", label: "Danh sách" }, { id: "detail", label: "Chi tiết" }, { id: "form", label: "Biểu mẫu" }, { id: "calendar", label: "Lịch công" }];

export function ErpDesignReference() {
  const [screen, setScreen] = useState<Screen>("components");
  const [query, setQuery] = useState("");
  const [state, setState] = useState("ready");
  const [date, setDate] = useState("2026-11-02");
  const [saved, setSaved] = useState(false);
  const result = people.filter((person) => `${person.name} ${person.id}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));
  const content = state === "empty" ? <EmptyState title="Chưa có dữ liệu" action={<Button onClick={() => setState("ready")}>Đặt lại</Button>} /> : state === "loading" ? <LoadingState /> : state === "error" ? <ErrorState action={<Button onClick={() => setState("ready")}>Thử lại</Button>} /> : state === "denied" ? <PermissionDeniedState /> : null;

  return <div className="page-stack">
    <PageHeader title="Bộ giao diện ERP" meta="Mẫu phát triển" />
    <div className={styles.selector}><Tabs label="Mẫu màn hình" items={screens.map((item) => ({ label: item.label, active: screen === item.id, onSelect: () => { setScreen(item.id); setSaved(false); } }))} /><Select label="Trạng thái mẫu" labelHidden value={state} onChange={(event) => setState(event.target.value)} options={[{ label: "Có dữ liệu", value: "ready" }, { label: "Trống", value: "empty" }, { label: "Đang tải", value: "loading" }, { label: "Lỗi", value: "error" }, { label: "Không có quyền", value: "denied" }]} /></div>
    <div className={styles.canvas}>
      {content ?? (screen === "components" ? <ErpComponentGallery /> : screen === "list" ? <ListPageLayout>
        <PageHeader title="Nhân viên" meta={`${result.length} hồ sơ`} action={<Button leftIcon={<Plus aria-hidden="true" size={16} />} onClick={() => setScreen("form")} variant="primary">Thêm nhân viên</Button>} />
        <ListWorkspace label="Danh sách mẫu" filters={<FilterBar><SearchInput label="Tìm nhân viên mẫu" placeholder="Tìm mã hoặc tên" value={query} onChange={(event) => setQuery(event.target.value)} /><Select label="Phòng ban" labelHidden placeholder="Tất cả phòng ban" options={[{ label: "Kỹ thuật", value: "technical" }]} /></FilterBar>} footer={<footer className="pagination"><span>1–{result.length} / {result.length}</span><span>Trang 1</span></footer>}><DataTable ariaLabel="Danh sách mẫu" data={result} getRowId={(row) => row.id} columns={[
          { id: "name", header: "Họ tên", priority: "primary", cell: (row) => <button className="record-identity record-identity--button" onClick={() => setScreen("detail")}><strong>{row.name}</strong><small>{row.id}</small></button> },
          { id: "department", header: "Phòng ban", accessor: "department" }, { id: "position", header: "Chức vụ", accessor: "position", hiddenOnMobile: true }, { id: "phone", header: "Điện thoại", accessor: "phone", hiddenOnMobile: true },
          { id: "status", header: "Trạng thái", cell: (row) => <StatusBadge tone={row.status === "Thử việc" ? "warning" : "success"}>{row.status}</StatusBadge> }
        ]} actions={() => <Button onClick={() => setScreen("detail")} size="sm">Chi tiết</Button>} /></ListWorkspace>
      </ListPageLayout> : screen === "detail" ? <DetailPageLayout>
        <EntityContextHeader code="NV001" title="Nguyễn Minh An" status={<StatusBadge tone="success">Đang làm việc</StatusBadge>} action={<Button onClick={() => setScreen("form")} variant="primary">Chỉnh sửa</Button>} />
        <DataSurface><Tabs label="Thông tin hồ sơ mẫu" items={[{ label: "Hồ sơ", active: true, onSelect: () => undefined }, { label: "Lịch công", onSelect: () => setScreen("calendar") }]} /><div className={styles.detail}><h2>Thông tin nhân viên</h2><dl>{[["Mã nhân viên", "NV001"], ["Phòng ban", "Kỹ thuật"], ["Chức vụ", "Kỹ sư"], ["Điện thoại", "0901 234 567"], ["Ngày vào làm", "02/11/2026"], ["Quản lý", "Lê Quốc Bình"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div></DataSurface>
      </DetailPageLayout> : screen === "form" ? <FormPageLayout>
        <PageHeader title="Thêm nhân viên" />
        <form className={styles.form} onSubmit={(event) => { event.preventDefault(); setSaved(true); }}><FormSection title="Thông tin nhân viên"><Input label="Mã nhân viên" name="code" defaultValue="NV004" required /><Input label="Họ và tên" name="name" required /><Input label="Điện thoại" name="phone" type="tel" /><Input label="Email" name="email" type="email" /></FormSection><FormSection title="Công việc"><Select label="Phòng ban" name="department" required placeholder="Chọn phòng ban" options={[{ label: "Kỹ thuật", value: "technical" }]} /><Select label="Chức vụ" name="position" placeholder="Chọn chức vụ" options={[{ label: "Kỹ sư", value: "engineer" }]} /></FormSection>{saved ? <p role="status">Biểu mẫu hợp lệ</p> : null}<FormActions><Button onClick={() => setScreen("list")}>Hủy</Button><Button type="submit" variant="primary">Kiểm tra mẫu</Button></FormActions></form>
      </FormPageLayout> : <DetailPageLayout>
        <EntityContextHeader title="Nguyễn Minh An" code="NV001 · Tháng 11/2026" />
        <div className={styles.calendarLayout}><Card><h2 className={styles.sectionTitle}>Lịch công</h2><WorkCalendar label="Lịch công mẫu" weeks={calendarWeeks(days)} selectedDate={date} onSelectDate={setDate} getDay={(day) => ({ label: `${day}: ${day === "2026-11-02" ? "Có công" : "Chưa có dữ liệu"}`, content: day === "2026-11-02" ? "X" : undefined, tone: "success" })} /></Card><Card><h2 className={styles.sectionTitle}>Chi tiết ngày công</h2><dl className={styles.dayFacts}><div><dt>Ngày</dt><dd>{date.split("-").reverse().join("/")}</dd></div>{date === "2026-11-02" ? <><div><dt>Chấm vào</dt><dd>08:00</dd></div><div><dt>Chấm ra</dt><dd>17:00</dd></div><div><dt>Ngày công</dt><dd>1</dd></div></> : <div><dt>Trạng thái</dt><dd>Chưa có dữ liệu</dd></div>}</dl></Card></div>
      </DetailPageLayout>)}
    </div>
  </div>;
}
