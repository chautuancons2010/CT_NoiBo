"use client";

import { ChevronRight } from "lucide-react";
import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";

import { Checkbox } from "@/components/shared/FormControls";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { cn } from "@/lib/utils/cn";
import { useIsPhone } from "@/lib/ui/useIsPhone";

export interface DataTableColumn<TData extends object> {
  id: string;
  header: string;
  accessor?: keyof TData;
  cell?: (row: TData) => ReactNode;
  sortable?: boolean;
  hiddenOnMobile?: boolean;
  align?: "left" | "center" | "right";
  /** Keeps the record identity readable before secondary data columns consume space. */
  priority?: "primary";
  width?: "compact" | "standard";
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
  actionLabel?: string;
  className?: string;
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
}

export interface DataTableSort {
  columnId: string;
  direction: "ascending" | "descending";
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
  emptyDescription = "Không có bản ghi phù hợp.",
  getRowId,
  selectedRowIds,
  onSelectRow,
  rowHrefPrefix,
  rowHrefSuffix = "",
  actions,
  actionLabel = "Thao tác",
  className,
  sort,
  onSortChange
}: DataTableProps<TData>) {
  const [activeRowId, setActiveRowId] = useState<string>();
  const [internalSort, setInternalSort] = useState<DataTableSort>();
  const isPhone = useIsPhone();
  const activeSort = sort ?? internalSort;

  const shownData = useMemo(() => {
    if (!activeSort) return data;
    const column = columns.find((item) => item.id === activeSort.columnId);
    if (!column?.sortable) return data;
    const key = column.accessor ?? column.id as keyof TData;
    return [...data].sort((left, right) => {
      const comparison = String(left[key] ?? "").localeCompare(String(right[key] ?? ""), "vi", {
        numeric: true,
        sensitivity: "base"
      });
      return activeSort.direction === "ascending" ? comparison : -comparison;
    });
  }, [activeSort, columns, data]);

  function changeSort(columnId: string) {
    const next: DataTableSort = {
      columnId,
      direction: activeSort?.columnId === columnId && activeSort.direction === "ascending" ? "descending" : "ascending"
    };
    if (onSortChange) onSortChange(next);
    else setInternalSort(next);
  }

  function isDirectAction(event: MouseEvent<HTMLElement>): boolean {
    return event.target instanceof Element && Boolean(event.target.closest("a, button, input, select, textarea, summary"));
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState description={error} />;
  }

  const isEmpty = shownData.length === 0;
  const columnCount = columns.length + (onSelectRow ? 1 : 0) + (actions ? 1 : 0);
  const mobileColumns = columns.filter((column) => !column.hiddenOnMobile);
  const primaryColumn = mobileColumns.find((column) => column.priority === "primary");
  const mobileTitle = primaryColumn ?? mobileColumns[1] ?? mobileColumns[0];
  const mobileEyebrow = mobileColumns[0] !== mobileTitle ? mobileColumns[0] : undefined;
  const mobileDetails = mobileColumns.filter((column) => column !== mobileTitle && column !== mobileEyebrow);

  return (
    <div className={cn("data-table-shell", className)} data-view={isPhone ? "mobile" : "desktop"}>
      {!isPhone ? <div className="data-table-scroll">
        <table aria-label={ariaLabel} className="data-table data-table--workspace">
          <colgroup>
            {onSelectRow ? <col data-column="selection" /> : null}
            {columns.map((column) => (
              <col data-column={column.id} data-priority={column.priority} data-width={column.width} key={column.id} />
            ))}
            {actions ? <col data-column="actions" /> : null}
          </colgroup>
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
                  data-column={column.id}
                  data-priority={column.priority}
                  aria-sort={column.sortable && activeSort?.columnId === column.id ? activeSort.direction : undefined}
                  scope="col"
                >
                  {column.sortable ? <button className="data-table__sort" onClick={() => changeSort(column.id)} type="button">{column.header}<span aria-hidden="true">{activeSort?.columnId === column.id ? activeSort.direction === "ascending" ? "↑" : "↓" : "↕"}</span></button> : column.header}
                </th>
              ))}
              {actions ? <th className="data-table__actions" scope="col">{actionLabel}</th> : null}
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td className="data-table__empty" colSpan={columnCount}>
                  <EmptyState description={emptyDescription} title={emptyTitle} />
                </td>
              </tr>
            ) : shownData.map((row, index) => {
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
                    if (event.key === "Enter" && rowHref && event.target === event.currentTarget) {
                      event.preventDefault();
                      event.currentTarget.querySelector<HTMLAnchorElement>(".data-table__row-link")?.click();
                    }
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
                    <td data-column={column.id} data-priority={column.priority} key={column.id} className={column.align ? `text-${column.align}` : undefined}>
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
      </div> : null}
      {isPhone ? <div className="mobile-record-list">
        {isEmpty ? (
          <EmptyState description={emptyDescription} title={emptyTitle} />
        ) : shownData.map((row, index) => {
          const rowId = getRowId?.(row, index) ?? String(index);
          const selected = selectedRowIds?.has(rowId) ?? false;
          const rowHref = rowHrefPrefix ? `${rowHrefPrefix}${encodeURIComponent(rowId)}${rowHrefSuffix}` : undefined;
          return (
            <article className="mobile-record" key={rowId}>
              <header className="mobile-record__header">
                <div className="mobile-record__identity">
                  {mobileEyebrow ? (
                    <div className="mobile-record__eyebrow">
                      <span>{mobileEyebrow.header}</span>
                      <strong>{renderCell(row, mobileEyebrow)}</strong>
                    </div>
                  ) : null}
                  {mobileTitle ? (
                    <div className="mobile-record__title">
                      <span className="sr-only">{mobileTitle.header}</span>
                      {renderCell(row, mobileTitle)}
                    </div>
                  ) : null}
                </div>
                {onSelectRow || actions ? (
                  <div className="mobile-record__actions">
                    {onSelectRow ? (
                      <Checkbox
                        aria-label={`Chọn dòng ${index + 1}`}
                        checked={selected}
                        label=""
                        onChange={(event) => onSelectRow(rowId, event.target.checked)}
                      />
                    ) : null}
                    {actions ? actions(row) : null}
                  </div>
                ) : null}
              </header>
              {mobileDetails.length ? (
                <dl className="mobile-record__facts">
                  {mobileDetails.map((column) => (
                    <div className="mobile-record__fact" key={column.id}>
                      <dt>{column.header}</dt>
                      <dd>{renderCell(row, column)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {rowHref ? (
                <Link className="mobile-record__open" href={rowHref}>
                  <span>Mở chi tiết</span>
                  <ChevronRight aria-hidden="true" size={19} />
                </Link>
              ) : null}
            </article>
          );
        })}
      </div> : null}
    </div>
  );
}

/** Canonical responsive list contract: desktop table and mobile records share one data source. */
export function Worklist<TData extends object>(props: DataTableProps<TData>) {
  return <DataTable {...props} />;
}
