import { PageHeader } from "@/components/shared/PageHeader"; import { ItemEditor, ItemWarehouseSettings } from "@/features/warehouse";
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <div className="page-stack"><PageHeader title="Chi tiết hàng hóa"/><ItemEditor id={id}/><ItemWarehouseSettings itemId={id}/></div>;}
