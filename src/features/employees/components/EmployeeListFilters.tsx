"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/shared/Button";
import { FilterBar, type AppliedFilter } from "@/components/shared/FilterBar";
import { SearchInput, Select, type SelectOption } from "@/components/shared/FormControls";

interface EmployeeListFiltersProps {
  defaults: Record<string, string | number | undefined>;
  departments: SelectOption[];
  positions: SelectOption[];
  employmentTypes: SelectOption[];
  statuses: SelectOption[];
}

const filterKeys = ["q", "departmentId", "positionId", "employmentTypeId", "status"] as const;
type FilterKey = typeof filterKeys[number];

export function EmployeeListFilters(props: EmployeeListFiltersProps) {
  return <EmployeeFilterForm {...props} key={JSON.stringify(props.defaults)} />;
}

function EmployeeFilterForm({ defaults, departments, positions, employmentTypes, statuses }: EmployeeListFiltersProps) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const [draft, setDraft] = useState(() => Object.fromEntries(filterKeys.map(key => [key, String(defaults[key] ?? "")])) as Record<FilterKey, string>);

  function navigate(values: Record<string, unknown>) {
    const params = new URLSearchParams();
    for (const key of filterKeys) {
      const value = String(values[key] ?? "").trim();
      if (value) params.set(key, value);
    }
    params.set("page", "1");
    params.set("pageSize", String(defaults.pageSize ?? 10));
    startTransition(() => router.push(`/employees?${params.toString()}`));
  }

  function clear() {
    setDraft({ q: "", departmentId: "", positionId: "", employmentTypeId: "", status: "" });
    startTransition(() => router.push("/employees"));
  }

  const definitions: Array<{ key: FilterKey; label: string; options?: SelectOption[] }> = [
    { key: "q", label: "Tìm kiếm" }, { key: "departmentId", label: "Phòng ban", options: departments },
    { key: "positionId", label: "Chức vụ", options: positions }, { key: "employmentTypeId", label: "Nhóm", options: employmentTypes },
    { key: "status", label: "Trạng thái", options: statuses }
  ];
  const activeFilters: AppliedFilter[] = definitions.flatMap(({ key, label, options }) => {
    const value = String(defaults[key] ?? "");
    return value ? [{ key, label, value: options?.find(option => option.value === value)?.label ?? value, onRemove: () => {
      setDraft(current => ({ ...current, [key]: "" }));
      navigate({ ...defaults, [key]: "" });
    } }] : [];
  });

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(Object.fromEntries(new FormData(event.currentTarget)));
  }

  return (
    <form aria-label="Tìm và lọc nhân viên" onSubmit={apply}>
      <FilterBar
        activeFilters={activeFilters}
        busy={loading}
        onClear={clear}
        onReset={() => setDraft(current => ({ ...current, departmentId: "", positionId: "", employmentTypeId: "", status: "" }))}
        searchAction={<Button busy={loading} disabled={loading} leftIcon={<Search aria-hidden="true" size={16} />} type="submit" variant="primary">Tìm</Button>}
        className="employee-filter-bar"
      >
        <SearchInput label="Tìm nhân viên" name="q" onChange={event => setDraft(current => ({ ...current, q: event.target.value }))} placeholder="Tìm mã, tên, SĐT" value={draft.q} />
        <Select label="Phòng ban" labelHidden name="departmentId" onChange={event => setDraft(current => ({ ...current, departmentId: event.target.value }))} options={departments} placeholder="Tất cả phòng ban" value={draft.departmentId} />
        <Select label="Chức vụ" labelHidden name="positionId" onChange={event => setDraft(current => ({ ...current, positionId: event.target.value }))} options={positions} placeholder="Tất cả chức vụ" value={draft.positionId} />
        <Select label="Nhóm làm việc" labelHidden name="employmentTypeId" onChange={event => setDraft(current => ({ ...current, employmentTypeId: event.target.value }))} options={employmentTypes} placeholder="Tất cả nhóm" value={draft.employmentTypeId} />
        <Select label="Trạng thái" labelHidden name="status" onChange={event => setDraft(current => ({ ...current, status: event.target.value }))} options={statuses} placeholder="Tất cả trạng thái" value={draft.status} />
      </FilterBar>
    </form>
  );
}
