import { BackLink } from "@/components/shared/BackLink";import { PageHeader } from "@/components/shared/PageHeader";import { CalendarSettings } from "@/features/timesheets/components/CalendarSettings";
export default function Page(){return <div className="page-stack"><BackLink href="/timesheets"/><PageHeader title="Lịch làm việc"/><CalendarSettings/></div>;}
