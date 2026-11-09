import { notFound } from "next/navigation";

import { EmployeeTimesheetMobile } from "@/features/timesheets/components/EmployeeTimesheetMobile";

export default function EmployeeTimesheetPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <main className="page-main ui-preview-page" id="main-content"><div className="page-stack"><EmployeeTimesheetMobile employeeId="NV001" periodId="preview-oct-2026" /></div></main>;
}
