import { redirect } from "next/navigation";
import { ModuleLockedState } from "@/components/shared/ModuleLockedState";
import { moduleKeys, type ModuleKey } from "@/config/systemSettings";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";

export default async function Page({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
  const [params, user] = await Promise.all([searchParams, getRequestUser()]);
  if (!user) redirect("/login");
  if (!moduleKeys.includes(params.module as ModuleKey)) redirect("/dashboard");
  return <ModuleLockedState module={params.module as ModuleKey} canManage={can(user.permissions, "system_admin.access") && can(user.permissions, "module.manage")} />;
}
