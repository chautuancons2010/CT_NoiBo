import { PageHeader } from "@/components/shared/PageHeader"; import { WarehouseEditor } from "@/features/warehouse";
export default async function Page({params}:{params:Promise<{id:string}>}){return <div className="page-stack"><PageHeader title="Chi tiết kho"/><WarehouseEditor id={(await params).id}/></div>;}
