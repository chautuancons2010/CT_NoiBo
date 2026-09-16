"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";

import { Checkbox } from "@/components/shared/FormControls";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { cn } from "@/lib/utils/cn";

export interface DataTableColumn<TData extends object> {
  id: string;
  header: string;
  accessor?: keyof TData;
  cell?: (row: TData) => ReactNode;
  sortable?: boolean;
  hiddenOnMobile?: boolean;
  align?: "left" | "center" | "right";
}

export interface DataTableProps<TData extends object> {
  ariaLabel?: string;
  columns: DataTableColumn<TData>[];
  data: TData[];
  loading?: boolean;
  error?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  getRowId?: (row: TData, index: number) => string;
  selectedRowIds?: ReadonlySet<string>;
  onSelectRow?: (rowId: string, selected: boolean) => void;
  rowHrefPrefix?: string;
  rowHrefSuffix?: string;
  actions?: (row: TData) => ReactNode;
  className?: string;
}

function renderCell<TData extends object>(row: TData, column: DataTableColumn<TData>): ReactNode {
  if (column.cell) {
    return column.cell(row);
  }

  if (!column.accessor) {
    return null;
  }

  const value = row[column.accessor];
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export function DataTable<TData extends object>({
  ariaLabel = "Bảng dữ liệu",
  columns,
  data,
  loading,
  error,
  emptyTitle = "Chưa có dữ liệu",
  emptyDescription = "Module sẽ được triển khai ở bước tiếp theo.",
  getRowId,
  selectedRowIds,
  onSelectRow,
  rowHrefPrefix,
  rowHrefSuffix = "",
  actions,
  className
}: DataTableProps<TData>) {
  const [activeRowId, setActiveRowId] = useState<string>();

  function isDirectAction(event: MouseEvent<HTMLElement>): boolean {
    return event.target instanceof Element && Boolean(event.target.closest("a, button, input, select, textarea, summary"));
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState description={error} />;
  }

  if (data.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className={cn("data-table-shell", className)}>
      <div className="data-table-scroll">
        <table aria-label={ariaLabel} className="data-table">
          <thead>
            <tr>
              {onSelectRow ? <th className="data-table__select">Chọn</th> : null}
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={cn(
                    column.sortable && "data-table__sortable",
                    column.align && `text-${column.align}`
                  )}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
              {actions ? <th className="data-table__actions">Thao tác</th> : null}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const rowId = getRowId?.(row, index) ?? String(index);
              const selected = selectedRowIds?.has(rowId) ?? false;
              const active = selected || activeRowId === rowId;
              const rowHref = rowHrefPrefix ? `${rowHrefPrefix}${encodeURIComponent(rowId)}${rowHrefSuffix}` : undefined;

              return (
                <tr
                  aria-selected={active || undefined}
                  className={active ? "is-selected" : undefined}
                  key={rowId}
                  onClick={(event) => {
                    if (!isDirectAction(event)) setActiveRowId(rowId);
                  }}
                  onDoubleClick={(event) => {
                    if (!isDirectAction(event)) event.currentTarget.querySelector<HTMLAnchorElement>(".data-table__row-link")?.click();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && rowHref) event.currentTarget.querySelector<HTMLAnchorElement>(".data-table__row-link")?.click();
                  }}
                  tabIndex={rowHref ? 0 : undefined}
                >
                  {onSelectRow ? (
                    <td className="data-table__select">
                      <Checkbox
                        aria-label={`Chọn dòng ${index + 1}`}
                        checked={selected}
                        label=""
                        onChange={(event) => onSelectRow(rowId, event.target.checked)}
                      />
                    </td>
                  ) : null}
                  {columns.map((column, columnIndex) => (
                    <td key={column.id} className={column.align ? `text-${column.align}` : undefined}>
                      {columnIndex === 0 && rowHref ? <Link className="data-table__row-link sr-only" href={rowHref}>Mở bản ghi {rowId}</Link> : null}
                      {renderCell(row, column)}
                    </td>
                  ))}
                  {actions ? <td className="data-table__actions">{actions(row)}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mobile-record-list">
        {data.map((row, index) => {
          const rowId = getRowId?.(row, index) ?? String(index);
          return (
            <article className="mobile-record" key={rowId}>
              {columns
                .filter((column) => !column.hiddenOnMobile)
                .map((column) => (
                  <div className="mobile-record__line" key={column.id}>
                    <span>{column.header}</span>
                    <strong>{renderCell(row, column)}</strong>
                  </div>
                ))}
              {actions ? <div className="mobile-record__actions">{actions(row)}</div> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
