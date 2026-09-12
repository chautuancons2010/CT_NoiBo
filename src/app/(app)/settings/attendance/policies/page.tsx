import { BackLink } from "@/components/shared/BackLink";import { PageHeader } from "@/components/shared/PageHeader";import { AttendanceSettings } from "@/features/attendance";
export default function Page(){return <div className="page-stack"><BackLink href="/timesheets"/><PageHeader title="Chính sách chấm công"/><AttendanceSettings activeTab="policy"/></div>;}
