import { PageHeader } from "@/components/shared/PageHeader";
import { getRouteMeta } from "@/config/routeRegistry";
import { DocumentTypeSettingsView, ImportExportSettingsView } from "@/features/import-export/components/ImportExportViews";

export default function Page() {
  return <div className="page-stack"><PageHeader title={getRouteMeta("/settings/import-export").title} /><ImportExportSettingsView /><DocumentTypeSettingsView /></div>;
}
