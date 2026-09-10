"use client";

import { useMemo, useState } from "react";

import { SearchInput } from "@/components/shared/FormControls";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { EmployeePickerOption, WorkerCategory } from "@/features/employees/types";
import { employeeStatusMeta, workerCategoryLabels } from "@/features/employees/services/employeeService";

export interface EmployeePickerProps {
  label: string;
  options: EmployeePickerOption[];
  workerCategory?: WorkerCategory;
}

export function EmployeePicker({ label, options, workerCategory }: EmployeePickerProps) {
  const [query, setQuery] = useState("");
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return options
      .filter((option) => !workerCategory || option.workerCategory === workerCategory)
      .filter((option) => {
        if (!normalizedQuery) {
          return true;
        }

        return [
          option.employeeCode,
          option.displayName,
          option.departmentName,
          option.positionName
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .slice(0, 6);
  }, [options, query, workerCategory]);

  return (
    <section className="employee-picker" aria-label={label}>
      <SearchInput
        label={label}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm theo tên, mã hoặc phòng ban"
        value={query}
      />
      <div className="employee-picker__list">
        {filteredOptions.map((option) => (
          <article className="employee-picker__item" key={option.id}>
            <span>
              <strong>{option.displayName}</strong>
              <small>
                {option.employeeCode} · {option.departmentName} · {option.positionName}
              </small>
            </span>
            <StatusBadge tone={employeeStatusMeta[option.employmentStatus].tone}>
              {workerCategoryLabels[option.workerCategory]}
            </StatusBadge>
          </article>
        ))}
      </div>
    </section>
  );
}

export function WorkerSelector(props: Omit<EmployeePickerProps, "workerCategory">) {
  return <EmployeePicker {...props} workerCategory="worker" />;
}
