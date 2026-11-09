import { notFound } from "next/navigation";
import { WorkspaceDesignPreview } from "@/features/foundation/components/WorkspaceDesignPreview";

export const metadata = { title: "Mẫu giao diện · Dữ liệu mẫu" };

export default async function WorkspacePreviewPage({ searchParams }: PageProps<"/ui-preview/workspace">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { screen } = await searchParams;
  return <WorkspaceDesignPreview screen={screen === "reference" || screen === "projects" || screen === "employees" ? screen : "dashboard"} />;
}
