import { PageHeader } from "@/components/shared/PageHeader"; import { InventoryDocumentEditor } from "@/features/warehouse";
export default async function Page({params}:{params:Promise<{id:string}>}){return <div className="page-stack"><PageHeader title="Phiếu chuyển kho"/><InventoryDocumentEditor id={(await params).id} type="transfer"/></div>;}
