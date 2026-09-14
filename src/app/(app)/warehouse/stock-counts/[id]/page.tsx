import { PageHeader } from "@/components/shared/PageHeader"; import { StockCountDetail } from "@/features/warehouse";
export default async function Page({params}:{params:Promise<{id:string}>}){return <div className="page-stack"><PageHeader title="Chi tiết kiểm kê"/><StockCountDetail id={(await params).id}/></div>;}
