import Link from "next/link";
import { connection } from "next/server";

import { Button } from "@/components/shared/Button";
import { PageHeader } from "@/components/shared/PageHeader";
import { ListPageLayout } from "@/components/shared/PageLayouts";
import { ProjectIssueTable } from "@/features/projects/components/ProjectIssueTable";
import { listProjectIssues } from "@/features/projects/services/projectUpdateRepository";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

export async function ProjectIssueCenterPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await connection();
  const value = (key: string) => {
    const current = searchParams[key];
    return Array.isArray(current) ? current[0] : current;
  };
  const issues = await listProjectIssues(requireAuthenticatedUser(await getRequestUser()), { status: value("status"), severity: value("severity") });

  return (
    <ListPageLayout>
      <PageHeader action={<Link href="/project-monitoring"><Button variant="secondary">Theo dõi dự án</Button></Link>} title="Trung tâm vấn đề" />
      <form className="project-update-filters">
        <select aria-label="Trạng thái" className="select" defaultValue={value("status") ?? ""} name="status"><option value="">Tất cả trạng thái</option><option value="open">Chưa xử lý</option><option value="in_progress">Đang xử lý</option><option value="resolved">Đã xử lý</option><option value="closed">Đã đóng</option></select>
        <select aria-label="Mức độ" className="select" defaultValue={value("severity") ?? ""} name="severity"><option value="">Tất cả mức độ</option><option value="critical">Nghiêm trọng</option><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option></select>
        <Button type="submit" variant="secondary">Lọc</Button>
      </form>
      <ProjectIssueTable issues={issues} />
    </ListPageLayout>
  );
}
