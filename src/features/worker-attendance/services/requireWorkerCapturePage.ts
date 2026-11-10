import "server-only";
import { redirect } from "next/navigation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";
import { can } from "@/lib/auth/permissions";
export async function requireWorkerCapturePage(id: string) {
  const user = requireAuthenticatedUser(await getRequestUser());
  if (!can(user.permissions, "worker_attendance.create")) redirect(id.startsWith("local-") ? "/employees/field-attendance" : `/employees/field-attendance/${id}`);
  return user;
}
