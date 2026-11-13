import { redirect } from "next/navigation";
import { AppError } from "@/lib/api/errors";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { getProject } from "../services/projectRepository";

export async function getProjectPageData(projectId: string, user: AuthenticatedUser) {
  try { return await getProject(projectId, user); }
  catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") redirect("/projects");
    throw error;
  }
}
