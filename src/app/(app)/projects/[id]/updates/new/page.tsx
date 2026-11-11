import { redirect } from "next/navigation";

export default async function Page({ params }: PageProps<"/projects/[id]/updates/new">) {
  const { id } = await params;
  redirect(`/projects/${encodeURIComponent(id)}/attendance`);
}
