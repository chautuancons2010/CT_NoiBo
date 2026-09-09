import { Plus } from "lucide-react";

import { Button } from "@/components/shared/Button";
import { ColumnVisibilityMenu } from "@/components/shared/ColumnVisibilityMenu";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput } from "@/components/shared/FormControls";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";

interface PlaceholderPageProps {
  title: string;
  description: string;
  moduleName: string;
  listPattern?: boolean;
  primaryActionLabel?: string;
}

interface PlaceholderRow {
  code: string;
  name: string;
  status: string;
}

const columns: DataTableColumn<PlaceholderRow>[] = [
  { id: "code", header: "Mã", accessor: "code", sortable: true },
  { id: "name", header: "Tên", accessor: "name" },
  { id: "status", header: "Trạng thái", accessor: "status", hiddenOnMobile: true }
];

export function PlaceholderPage({
  title,
  description,
  moduleName,
  listPattern = false,
  primaryActionLabel
}: PlaceholderPageProps) {
  return (
    <div className="page-stack">
      <PageHeader
        action={
          primaryActionLabel ? (
            <Button leftIcon={<Plus aria-hidden="true" size={16} />} variant="primary">
              {primaryActionLabel}
            </Button>
          ) : null
        }
        description={description}
        title={title}
      />
      {listPattern ? (
        <>
          <FilterBar
            actions={
              <ColumnVisibilityMenu
                columns={columns.map((column) => ({
                  id: column.id,
                  label: column.header,
                  visible: true
                }))}
              />
            }
          >
            <SearchInput placeholder={`Tìm trong ${moduleName.toLowerCase()}`} />
          </FilterBar>
          <DataTable
            columns={columns}
            data={[]}
            emptyDescription="Module sẽ được triển khai ở bước tiếp theo."
            emptyTitle={`Chưa có dữ liệu ${moduleName.toLowerCase()}`}
          />
          <Pagination page={1} pageCount={1} />
        </>
      ) : (
        <DataTable
          columns={columns}
          data={[]}
          emptyDescription="Module sẽ được triển khai ở bước tiếp theo."
          emptyTitle={moduleName}
        />
      )}
    </div>
  );
}
