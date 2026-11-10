"use client";

import { useEffect, useState } from "react";

import { Select } from "@/components/shared/FormControls";
import type { Shift } from "@/features/timesheets/types/timesheetTypes";

export function ProjectShiftSelect({ open }: { open: boolean }) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || shifts.length) return;
    const controller = new AbortController();
    void fetch("/api/v1/shifts", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { data?: { shifts?: Shift[] }; error?: { message?: string } };
        if (!response.ok) throw new Error(body.error?.message ?? "Không thể tải ca làm.");
        const active = (body.data?.shifts ?? []).filter((shift) => shift.active);
        setShifts(active);
        setSelectedId(active.find((shift) => shift.code === "DAY")?.id ?? active[0]?.id ?? "");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải ca làm.");
      });
    return () => controller.abort();
  }, [open, shifts.length]);

  const selected = shifts.find((shift) => shift.id === selectedId);
  return <>
    <Select disabled={!shifts.length} label="Ca làm" name="shiftId" onChange={(event) => setSelectedId(event.target.value)} options={shifts.map((shift) => ({ value: shift.id, label: `${shift.name} · ${shift.startTime}–${shift.endTime}` }))} placeholder={error || "Chưa có ca làm được cấu hình"} required value={selectedId} />
    {selected ? <>
      <input name="shiftCode" type="hidden" value={selected.code} />
      <input name="shiftName" type="hidden" value={selected.name} />
      <input name="shiftStart" type="hidden" value={selected.startTime} />
      <input name="shiftEnd" type="hidden" value={selected.endTime} />
    </> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
  </>;
}
