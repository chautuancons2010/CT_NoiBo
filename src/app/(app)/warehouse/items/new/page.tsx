import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionDeniedState } from "@/components/shared/States";
import { InventoryItemEditor } from "@/features/warehouse";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";

export default async function Page() {
  const user = await getRequestUser();
  if (!user || !can(user.permissions, "warehouse.item.manage")) return <PermissionDeniedState />;
  return <div className="page-stack"><PageHeader title="Thêm hàng hóa" /><InventoryItemEditor /></div>;
}
