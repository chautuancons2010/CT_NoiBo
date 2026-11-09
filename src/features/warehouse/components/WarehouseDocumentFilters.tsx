"use client";

import { useRef, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { FilterBar, FilterTabs, type AppliedFilter } from "@/components/shared/FilterBar";
import { Input, SearchInput, Select, type SelectOption } from "@/components/shared/FormControls";

export interface DocumentCriteria { status: string; warehouseId: string; from: string; to: string }
export const emptyDocumentCriteria: DocumentCriteria = { status: "", warehouseId: "", from: "", to: "" };
const statuses = [
  { value: "draft", label: "Nháp" }, { value: "submitted", label: "Chờ ghi sổ" }, { value: "posted", label: "Đã ghi sổ" },
  { value: "cancelled", label: "Đã hủy" }, { value: "reversed", label: "Đã đảo" }
];

interface Props {
  search: string;
  criteria: DocumentCriteria;
  onApply: (criteria: DocumentCriteria, search: string) => void;
  warehouses: SelectOption[];
}

export function WarehouseDocumentFilters(props: Props) {
  return <DocumentFilterForm {...props} key={JSON.stringify([props.criteria, props.search])} />;
}

function DocumentFilterForm({ search, criteria, onApply, warehouses }: Props) {
  const [draft, setDraft] = useState(criteria);
  const [draftSearch, setDraftSearch] = useState(search);
  const form = useRef<HTMLFormElement>(null);
  const update = (key: keyof DocumentCriteria, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const date = (value: string) => value.split("-").reverse().join("/");
  const activeFilters: AppliedFilter[] = [
    ...(search ? [{ key: "q", label: "Tìm kiếm", value: search, onRemove: () => onApply(criteria, "") }] : []),
    ...(criteria.status ? [{ key: "status", label: "Trạng thái", value: statuses.find(item => item.value === criteria.status)?.label ?? criteria.status, onRemove: () => onApply({ ...criteria, status: "" }, search) }] : []),
    ...(criteria.warehouseId ? [{ key: "warehouseId", label: "Kho", value: warehouses.find(item => item.value === criteria.warehouseId)?.label ?? criteria.warehouseId, onRemove: () => onApply({ ...criteria, warehouseId: "" }, search) }] : []),
    ...(criteria.from ? [{ key: "from", label: "Từ ngày", value: date(criteria.from), onRemove: () => onApply({ ...criteria, from: "" }, search) }] : []),
    ...(criteria.to ? [{ key: "to", label: "Đến ngày", value: date(criteria.to), onRemove: () => onApply({ ...criteria, to: "" }, search) }] : [])
  ];
  function apply(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onApply(draft, draftSearch.trim()); }
  return <>
    <FilterTabs label="Trạng thái chứng từ kho" onChange={status => onApply({ ...criteria, status }, search)} options={[{ value: "", label: "Tất cả" }, ...statuses.slice(0,3)]} value={criteria.status} />
    <form aria-label="Tìm và lọc chứng từ kho" onSubmit={apply} ref={form}>
      <FilterBar activeFilters={activeFilters} canApply={() => form.current?.reportValidity() ?? false} label="Bộ lọc chứng từ kho" onApply={() => form.current?.requestSubmit()} onClear={() => onApply({ ...emptyDocumentCriteria }, "")} onReset={() => setDraft({ ...emptyDocumentCriteria })} searchAction={<Button leftIcon={<Search aria-hidden="true" size={16} />} type="submit" variant="primary">Tìm</Button>}>
        <SearchInput label="Tìm chứng từ kho" onChange={event => setDraftSearch(event.target.value)} placeholder="Tìm số chứng từ" value={draftSearch} />
        <Select label="Trạng thái chứng từ" onChange={event => update("status", event.target.value)} options={[{ value: "", label: "Tất cả trạng thái" }, ...statuses]} value={draft.status} />
        <Select label="Kho" onChange={event => update("warehouseId", event.target.value)} options={[{ value: "", label: "Tất cả kho" }, ...warehouses]} value={draft.warehouseId} />
        <Input label="Từ ngày" max={draft.to || undefined} onChange={event => update("from", event.target.value)} type="date" value={draft.from} />
        <Input label="Đến ngày" min={draft.from || undefined} onChange={event => update("to", event.target.value)} type="date" value={draft.to} />
      </FilterBar>
    </form>
  </>;
}
