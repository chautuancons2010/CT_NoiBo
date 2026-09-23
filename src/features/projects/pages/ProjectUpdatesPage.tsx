import { Plus } from "lucide-react";
import Link from "next/link";
import { BackLink } from "@/components/shared/BackLink";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/States";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectUpdateCard } from "@/features/projects/components/ProjectUpdateCard";
import { getProject } from "@/features/projects/services/projectRepository";
import { listProjectUpdates } from "@/features/projects/services/projectUpdateRepository";
import { projectUpdateQuerySchema } from "@/features/projects/schemas/projectSchemas";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

export async function ProjectUpdatesPage({ projectId, searchParams }: { projectId: string; searchParams: Record<string, string | string[] | undefined> }) {
  const user = requireAuthenticatedUser(await getRequestUser()); const project = await getProject(projectId, user);
  const flat = Object.fromEntries(Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  const filters = projectUpdateQuerySchema.parse(flat); const result = await listProjectUpdates(user, projectId, filters);
  return <div className="page-stack"><BackLink href={`/projects/${projectId}/progress`} label="Thi công & Tiến độ" /><PageHeader eyebrow={project.code} meta={<span>Nhật ký hiện trường</span>} title={project.name} />
    <div className="project-page-toolbar"><form className="project-update-filters"><input aria-label="Tìm cập nhật" className="input" defaultValue={filters.search} name="search" placeholder="Tìm tiêu đề, nội dung" type="search" /><select aria-label="Loại cập nhật" className="select" defaultValue={filters.type ?? ""} name="type"><option value="">Tất cả loại</option><option value="progress">Tiến độ</option><option value="issue">Vấn đề</option><option value="material">Vật tư</option><option value="safety">An toàn</option><option value="change">Thay đổi</option><option value="general">Thông tin chung</option></select><select aria-label="Trạng thái" className="select" defaultValue={filters.status ?? ""} name="status"><option value="">Tất cả trạng thái</option><option value="in_progress">Đang thực hiện</option><option value="waiting">Chờ xử lý</option><option value="done">Hoàn thành</option></select><Button type="submit">Lọc</Button></form><Link href={`/projects/${projectId}/progress?mode=field-update`}><Button leftIcon={<Plus size={16} />} variant="primary">Cập nhật hiện trường</Button></Link></div>
    {result.items.length ? <div className="project-update-timeline">{result.items.map((update) => <ProjectUpdateCard key={update.id} update={update} />)}{result.nextCursor ? <Link className="load-more-link" href={`?cursor=${encodeURIComponent(result.nextCursor)}`}>Xem thêm</Link> : null}</div> : <EmptyState title="Chưa có cập nhật" />}
  </div>;
}
