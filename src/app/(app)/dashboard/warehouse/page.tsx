import { PermissionDeniedState } from "@/components/shared/States";
import { DashboardView } from "@/features/dashboard/components/DashboardView";
import { canUseDashboardProfile } from "@/features/dashboard/registry";
import { getRequestUser } from "@/services/auth/getRequestUser";

export default async function Page() {
  const user = await getRequestUser();
  if (!user || !canUseDashboardProfile(user, "warehouse")) return <PermissionDeniedState />;
  return <DashboardView profile="warehouse" />;
}
