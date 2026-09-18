import { PageHeader } from "@/components/shared/PageHeader";
import { AttendanceAdminDashboard } from "@/features/attendance/components/AttendanceAdminDashboard";

export default function Page(){return <div className="page-stack"><PageHeader title="Chấm công hôm nay"/><AttendanceAdminDashboard/></div>;}
