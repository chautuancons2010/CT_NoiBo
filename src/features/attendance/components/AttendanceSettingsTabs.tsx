import { Tabs } from "@/components/shared/Tabs";

export function AttendanceSettingsTabs({ active }: { active: "policy" | "shifts" | "locations" | "calendar" }) {
  return <Tabs label="Cấu hình chấm công" items={[
    { label: "Chính sách", href: "/settings/attendance", active: active === "policy" },
    { label: "Ca làm", href: "/settings/attendance/shifts", active: active === "shifts" },
    { label: "Địa điểm", href: "/settings/attendance/locations", active: active === "locations" },
    { label: "Lịch làm việc", href: "/settings/attendance/calendar", active: active === "calendar" }
  ]} />;
}
