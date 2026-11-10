"use client";

import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from "lucide-react";
import { cloneElement, isValidElement, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";

import { Checkbox, Select } from "@/components/shared/FormControls";
import { Button, IconButton } from "@/components/shared/Button";
import { ActionButton } from "@/components/shared/ActionBars";
import { DropdownMenu, type DropdownMenuProps } from "@/components/shared/DropdownMenu";
import { EmptyState, ErrorState } from "@/components/shared/States";
import { TableSkeleton } from "@/components/shared/LoadingExperience";
import { Pagination } from "@/components/shared/Pagination";
import { cn } from "@/lib/utils/cn";
import { useIsPhone } from "@/lib/ui/useIsPhone";

export interface DataTableColumn<TData extends object> {
  id: string;
  header: string;
  accessor?: keyof TData;
  sortValue?: (row: TData) => string | number | null | undefined;
  cell?: (row: TData) => ReactNode;
  sortable?: boolean;
  /** Places secondary fields in the expandable phone section; fields remain accessible. */
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
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  getRowId?: (row: TData, index: number) => string;
  selectedRowIds?: ReadonlySet<string>;
  onSelectRow?: (rowId: string, selected: boolean) => void;
  rowHrefPrefix?: string;
  rowHrefSuffix?: string;
  getRowHref?: (row: TData) => string;
  /** Opening lists use one click; selection-oriented workbenches retain their current behavior. */
  rowActivation?: "select" | "open";
  actions?: (row: TData) => ReactNode;
  actionLabel?: string;
  className?: string;
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  /** Opt in for a complete local dataset; server-paged lists keep their own pager. */
  pageSize?: number;
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

function isDirectMobileAction(node: ReactNode): boolean {
  if (!isValidElement(node)) return false;
  return node.type === Button || node.type === IconButton || node.type === ActionButton
    || node.type === Link || node.type === "button" || node.type === "a";
}

export function DataTable<TData extends object>({
  ariaLabel = "Bảng dữ liệu",
  columns,
  data,
  loading,
  error,
  onRetry,
  emptyTitle = "Chưa có dữ liệu",
  emptyDescription = "Không có bản ghi phù hợp.",
  getRowId,
  selectedRowIds,
  onSelectRow,
  rowHrefPrefix,
  rowHrefSuffix = "",
  getRowHref,
  rowActivation = onSelectRow ? "select" : "open",
  actions,
  actionLabel = "Thao tác",
  className,
  sort,
  onSortChange,
  pageSize
}: DataTableProps<TData>) {
  const [activeRowId, setActiveRowId] = useState<string>();
  const [internalSort, setInternalSort] = useState<DataTableSort>();
  const [paging, setPaging] = useState<{ data: TData[]; sort?: DataTableSort; page: number }>();
  // Keep list comparison stable on desktop and tablet. Wide tables scroll inside
  // their surface; only phone navigation uses the record layout.
  const isPhone = useIsPhone();
  const activeSort = sort ?? internalSort;

  const shownData = useMemo(() => {
    if (!activeSort) return data;
    const column = columns.find((item) => item.id === activeSort.columnId);
    if (!column?.sortable) return data;
    const key = column.accessor ?? column.id as keyof TData;
    return [...data].sort((left, right) => {
      const leftValue = column.sortValue ? column.sortValue(left) : left[key];
      const rightValue = column.sortValue ? column.sortValue(right) : right[key];
      const comparison = typeof leftValue === "number" && typeof rightValue === "number" ? leftValue - rightValue : String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "vi", {
        numeric: true,
        sensitivity: "base"
      });
      return activeSort.direction === "ascending" ? comparison : -comparison;
    });
  }, [activeSort, columns, data]);
  const size = pageSize && Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : undefined;
  const pageCount = size ? Math.max(1, Math.ceil(shownData.length / size)) : 1;
  const page = paging?.data === data && paging.sort === activeSort ? Math.min(paging.page, pageCount) : 1;
  const pageData = size ? shownData.slice((page - 1) * size, page * size) : shownData;
  const showOpenColumn = Boolean(getRowHref || rowHrefPrefix) && !actions;
  const hasActions = Boolean(actions) || showOpenColumn;

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

  function openRow(event: MouseEvent<HTMLElement>, selector: string) {
    if (isDirectAction(event) || window.getSelection()?.toString().trim()) return;
    const link = event.currentTarget.querySelector<HTMLAnchorElement>(selector);
    link?.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey, altKey: event.altKey }));
  }

  if (loading) {
    return <div aria-busy="true" aria-label="Đang tải dữ liệu" className="data-table-loading" role="status"><span className="sr-only">Đang tải dữ liệu</span><TableSkeleton columns={columns.length + (hasActions ? 1 : 0)} /></div>;
  }

  if (error) {
    return <ErrorState action={onRetry ? <Button onClick={onRetry}>Thử lại</Button> : undefined} description={error} />;
  }

  const isEmpty = shownData.length === 0;
  const columnCount = columns.length + (onSelectRow ? 1 : 0) + (hasActions ? 1 : 0);
  const visualColumns = columns.filter((column) => /^(image|avatar|photo|thumbnail)$/i.test(column.id));
  const mobileColumns = columns.filter((column) => !column.hiddenOnMobile && !visualColumns.includes(column));
  const primaryColumn = columns.find((column) => column.priority === "primary");
  const namedColumn = mobileColumns.find((column) => /(^|_)(name|title|employee|worker|item|partner|project)(_|$)/i.test(column.id));
  const mobileTitle = primaryColumn ?? namedColumn ?? mobileColumns[1] ?? mobileColumns[0] ?? columns[0];
  const mobileEyebrow = mobileColumns[0] !== mobileTitle ? mobileColumns[0] : undefined;
  const mobileStatus = mobileColumns.find((column) => /(?:status|state)$/i.test(column.id) && column !== mobileTitle && column !== mobileEyebrow);
  const availableDetails = mobileColumns.filter((column) => column !== mobileTitle && column !== mobileEyebrow && column !== mobileStatus);
  const mobileDetails = availableDetails.slice(0, 2);
  const secondaryDetails = columns.filter((column) => (column.hiddenOnMobile || availableDetails.indexOf(column) >= 2 || visualColumns.indexOf(column) > 0) && column !== mobileTitle && column !== mobileEyebrow && column !== mobileStatus);
  const sortableColumns = columns.filter((column) => column.sortable);

  return (
    <div className={cn("data-table-shell", className)} data-view={isPhone ? "mobile" : "desktop"}>
      {!isPhone ? <div aria-label={ariaLabel} className="data-table-scroll" role="region" tabIndex={0}>
        <table aria-label={ariaLabel} className="data-table data-table--workspace">
          <colgroup>
            {onSelectRow ? <col data-column="selection" /> : null}
            {columns.map((column) => (
              <col data-column={column.id} data-priority={column.priority} data-width={column.width} key={column.id} />
            ))}
            {hasActions ? <col data-column={showOpenColumn ? "open" : "actions"} /> : null}
          </colgroup>
          <thead>
            <tr>
              {onSelectRow ? <th className="data-table__select" data-column="selection">Chọn</th> : null}
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={cn(
                    column.sortable && "data-table__sortable",
                    column.align && `text-${column.align}`
                  )}
                  data-column={column.id}
                  data-priority={column.priority}
                  data-width={column.width}
                  aria-sort={column.sortable && activeSort?.columnId === column.id ? activeSort.direction : undefined}
                  scope="col"
                >
                  {column.sortable ? <button className="data-table__sort" onClick={() => changeSort(column.id)} type="button">{column.header}<span aria-hidden="true">{activeSort?.columnId === column.id ? activeSort.direction === "ascending" ? "↑" : "↓" : "↕"}</span></button> : column.header}
                </th>
              ))}
              {hasActions ? <th className="data-table__actions" data-column={showOpenColumn ? "open" : "actions"} scope="col">{showOpenColumn ? <span className="sr-only">Chi tiết</span> : actionLabel}</th> : null}
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td className="data-table__empty" colSpan={columnCount}>
                  <EmptyState description={emptyDescription} title={emptyTitle} />
                </td>
              </tr>
            ) : pageData.map((row, index) => {
              const rowIndex = size ? (page - 1) * size + index : index;
              const rowId = getRowId?.(row, rowIndex) ?? String(rowIndex);
              const selected = selectedRowIds?.has(rowId) ?? false;
              const active = selected || activeRowId === rowId;
              const rowHref = getRowHref?.(row) ?? (rowHrefPrefix ? `${rowHrefPrefix}${encodeURIComponent(rowId)}${rowHrefSuffix}` : undefined);

              return (
                <tr
                  aria-selected={active || undefined}
                  className={active ? "is-selected" : undefined}
                  data-row-activation={rowHref ? rowActivation : undefined}
                  key={rowId}
                  onClick={(event) => {
                    if (rowActivation === "open" && rowHref) openRow(event, ".data-table__row-link");
                    else if (rowActivation === "select" && !isDirectAction(event)) setActiveRowId(rowId);
                  }}
                  onDoubleClick={(event) => {
                    if (rowActivation !== "open" && !isDirectAction(event)) event.currentTarget.querySelector<HTMLAnchorElement>(".data-table__row-link")?.click();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && rowHref && event.target === event.currentTarget) {
                      event.preventDefault();
                      event.currentTarget.querySelector<HTMLAnchorElement>(".data-table__row-link")?.click();
                    }
                  }}
                  tabIndex={rowHref && (!showOpenColumn || rowActivation === "select") ? 0 : undefined}
                >
                  {onSelectRow ? (
                    <td className="data-table__select" data-column="selection">
                      <Checkbox
                        aria-label={`Chọn dòng ${index + 1}`}
                        checked={selected}
                        label=""
                        onChange={(event) => onSelectRow(rowId, event.target.checked)}
                      />
                    </td>
                  ) : null}
                  {columns.map((column, columnIndex) => (
                    <td data-column={column.id} data-priority={column.priority} data-width={column.width} key={column.id} className={column.align ? `text-${column.align}` : undefined}>
                      {columnIndex === 0 && rowHref && !showOpenColumn ? <Link className="data-table__row-link sr-only" href={rowHref} tabIndex={-1}>Mở chi tiết dòng {index + 1}</Link> : null}
                      {renderCell(row, column)}
                    </td>
                  ))}
                  {actions ? <td className="data-table__actions" data-column="actions">{actions(row)}</td> : showOpenColumn ? <td className="data-table__actions" data-column="open"><Link aria-label={`Mở chi tiết dòng ${index + 1}`} className="data-table__row-link data-table__open" href={rowHref!} title="Mở chi tiết"><ChevronRight aria-hidden="true" size={17} /></Link></td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div> : null}
      {isPhone && sortableColumns.length && !isEmpty ? <div className="mobile-record-sort">
        {!size ? <span className="mobile-record-sort__count">{shownData.length} bản ghi</span> : null}
        <Select label="Sắp xếp" labelHidden onChange={(event) => {
          if (!event.target.value) return;
          const next: DataTableSort = { columnId: event.target.value, direction: activeSort?.direction ?? "ascending" };
          if (onSortChange) onSortChange(next);
          else setInternalSort(next);
        }} options={sortableColumns.map((column) => ({ label: column.header, value: column.id }))} placeholder={activeSort ? undefined : "Sắp xếp"} value={activeSort?.columnId ?? ""} />
        <IconButton disabled={!activeSort} label={activeSort?.direction === "descending" ? "Đổi sang tăng dần" : "Đổi sang giảm dần"} onClick={() => { if (activeSort) changeSort(activeSort.columnId); }} variant="secondary">
          {activeSort?.direction === "descending" ? <ArrowDown aria-hidden="true" size={20} /> : <ArrowUp aria-hidden="true" size={20} />}
        </IconButton>
      </div> : null}
      {isPhone ? <div aria-label={ariaLabel} className="mobile-record-list">
        {isEmpty ? (
          <EmptyState description={emptyDescription} title={emptyTitle} />
        ) : pageData.map((row, index) => {
          const rowIndex = size ? (page - 1) * size + index : index;
          const rowId = getRowId?.(row, rowIndex) ?? String(rowIndex);
          const selected = selectedRowIds?.has(rowId) ?? false;
          const rowHref = getRowHref?.(row) ?? (rowHrefPrefix ? `${rowHrefPrefix}${encodeURIComponent(rowId)}${rowHrefSuffix}` : undefined);
          const actionContent = actions?.(row);
          const existingActionMenu = isValidElement(actionContent) && actionContent.type === DropdownMenu;
          const useActionMenu = existingActionMenu || isDirectMobileAction(actionContent);
          // Compound actions may own an editor or a file input that must stay mounted.
          const inlineActionContent = useActionMenu ? null : actionContent;
          const mobileActionMenu = useActionMenu ? existingActionMenu && isValidElement<DropdownMenuProps>(actionContent)
            ? cloneElement(actionContent, { mobileTriggerLabel: actionLabel })
            : <DropdownMenu label={actionLabel} mobileTriggerLabel={actionLabel}>{actionContent}</DropdownMenu> : null;
          return (
            <article className={cn("mobile-record", selected && "is-selected")} data-has-actions={Boolean(actionContent)} data-row-activation={rowHref ? rowActivation : undefined} key={rowId} onClick={event => { if (rowActivation === "open" && rowHref) openRow(event, ".mobile-record__open"); }}>
              <header className="mobile-record__header">
                {visualColumns[0] && visualColumns[0] !== mobileTitle ? <div className="mobile-record__thumbnail">{renderCell(row, visualColumns[0])}</div> : null}
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
                {onSelectRow || mobileStatus ? (
                  <div className="mobile-record__state">
                    {mobileStatus ? <div className="mobile-record__status"><span className="sr-only">{mobileStatus.header}</span>{renderCell(row, mobileStatus)}</div> : null}
                    {onSelectRow ? (
                      <Checkbox
                        aria-label={`Chọn dòng ${index + 1}`}
                        checked={selected}
                        label=""
                        onChange={(event) => onSelectRow(rowId, event.target.checked)}
                      />
                    ) : null}
                  </div>
                ) : null}
                {rowHref && mobileTitle ? <Link aria-label="Mở chi tiết" className="mobile-record__open mobile-record__identity-open" href={rowHref}><ChevronRight aria-hidden="true" size={20} /></Link> : null}
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
              {secondaryDetails.length ? <details className="mobile-record__more">
                <summary><span>Thông tin thêm</span><ChevronDown aria-hidden="true" size={18} /></summary>
                <dl className="mobile-record__facts mobile-record__facts--secondary">
                  {secondaryDetails.map((column) => <div className="mobile-record__fact" key={column.id}><dt>{column.header}</dt><dd>{renderCell(row, column)}</dd></div>)}
                </dl>
              </details> : null}
              {inlineActionContent ? <div className="mobile-record__toolbar">{inlineActionContent}</div> : null}
              {(rowHref && !mobileTitle) || mobileActionMenu ? <footer className="mobile-record__footer">
                {rowHref && !mobileTitle ? <Link className="mobile-record__open" href={rowHref}>
                  <span>Mở chi tiết</span>
                  <ChevronRight aria-hidden="true" size={19} />
                </Link> : null}
                {mobileActionMenu ? <div className="mobile-record__actions">{mobileActionMenu}</div> : null}
              </footer> : null}
            </article>
          );
        })}
      </div> : null}
      {size && !isEmpty ? <Pagination page={page} pageCount={pageCount} totalItems={shownData.length} pageSize={size} onPageChange={next => setPaging({ data, sort: activeSort, page: next })} /> : null}
    </div>
  );
}

/** Canonical responsive list contract: desktop table and mobile records share one data source. */
export function Worklist<TData extends object>(props: DataTableProps<TData>) {
  return <DataTable {...props} />;
}
