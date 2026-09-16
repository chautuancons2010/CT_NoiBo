import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionDeniedState } from "@/components/shared/States";
import { ItemListView } from "@/features/warehouse";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";

export default async function Page(){
  const user = await getRequestUser();
  if (!user || !can(user.permissions, "warehouse.item.view")) return <PermissionDeniedState />;
  return <div className="page-stack"><PageHeader title="Hàng hóa"/><ItemListView canManage={Boolean(user && can(user.permissions, "warehouse.item.manage"))}/></div>;
}
