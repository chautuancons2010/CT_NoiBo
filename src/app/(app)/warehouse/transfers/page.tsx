import { PageHeader } from "@/components/shared/PageHeader"; import { DocumentListView } from "@/features/warehouse";
export default function Page(){return <div className="page-stack"><PageHeader title="Chuyển kho"/><DocumentListView type="transfer"/></div>;}
