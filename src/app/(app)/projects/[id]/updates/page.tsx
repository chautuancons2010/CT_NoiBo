import { redirect } from "next/navigation";

export default async function Page({ params }: PageProps<"/projects/[id]/updates">) {
  const { id } = await params;
  redirect(`/projects/${encodeURIComponent(id)}/attendance`);
}
