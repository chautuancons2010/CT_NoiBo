import { redirect } from "next/navigation";

export default async function Page({ params, searchParams }: PageProps<"/projects/[id]/updates/new">) {
  const { id } = await params;
  const query = await searchParams;
  const task = Array.isArray(query.task) ? query.task[0] : query.task;
  redirect(`/projects/${id}/progress?mode=field-update${task ? `&task=${encodeURIComponent(task)}` : ""}`);
}
