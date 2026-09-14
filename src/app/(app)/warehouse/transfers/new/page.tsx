import { PageHeader } from "@/components/shared/PageHeader"; import { InventoryDocumentEditor } from "@/features/warehouse";
export default function Page(){return <div className="page-stack"><PageHeader title="Tạo phiếu chuyển"/><InventoryDocumentEditor type="transfer"/></div>;}
