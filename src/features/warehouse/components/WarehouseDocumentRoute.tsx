import "server-only";

import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionDeniedState } from "@/components/shared/States";
import { InventoryDocumentEditor } from "@/features/warehouse/components/InventoryDocumentEditor";
import { DocumentListView } from "@/features/warehouse/components/WarehouseListViews";
import type { InventoryDocumentType } from "@/features/warehouse/types/warehouseTypes";
import { can, type Permission } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";

type DocumentType = Exclude<InventoryDocumentType, "reversal">;

const permissionMap: Record<DocumentType, { view: Permission; create: Permission; post: Permission; reverse?: Permission }> = {
  receipt: { view: "warehouse.receipt.view", create: "warehouse.receipt.create", post: "warehouse.receipt.post", reverse: "warehouse.receipt.reverse" },
  issue: { view: "warehouse.issue.view", create: "warehouse.issue.create", post: "warehouse.issue.post", reverse: "warehouse.issue.reverse" },
  transfer: { view: "warehouse.transfer.view", create: "warehouse.transfer.create", post: "warehouse.transfer.post" },
  adjustment: { view: "warehouse.adjustment.view", create: "warehouse.adjustment.create", post: "warehouse.adjustment.post" }
};

export async function WarehouseDocumentRoute({ type, id, title }: { type: DocumentType; id?: string; title: string }) {
  const user = await getRequestUser();
  const permissions = permissionMap[type];
  const allowed = Boolean(user && can(user.permissions, id ? permissions.view : permissions.create));
  if (!user || !allowed) return <PermissionDeniedState />;

  return (
    <div className="page-stack">
      <PageHeader title={title} />
      <InventoryDocumentEditor
        canCreate={can(user.permissions, permissions.create)}
        canPost={can(user.permissions, permissions.post)}
        canReverse={Boolean(permissions.reverse && can(user.permissions, permissions.reverse))}
        id={id}
        type={type}
      />
    </div>
  );
}

export async function WarehouseDocumentListRoute({ type, title }: { type: DocumentType; title: string }) {
  const user = await getRequestUser();
  const permissions = permissionMap[type];
  if (!user || !can(user.permissions, permissions.view)) return <PermissionDeniedState />;
  return (
    <div className="page-stack">
      <PageHeader title={title} />
      <DocumentListView canCreate={can(user.permissions, permissions.create)} type={type} />
    </div>
  );
}
