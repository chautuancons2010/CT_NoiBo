"use client";

import { MapPin, Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Input } from "@/components/shared/FormControls";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Tabs } from "@/components/shared/Tabs";
import type { AttendanceLocation, AttendancePolicy } from "@/features/attendance/types/attendanceTypes";

interface Configuration { policy: AttendancePolicy; locations: AttendanceLocation[] }

async function readApi<T>(response: Response): Promise<T> {
  const body = await response.json() as { data?: T; error?: { message: string } };
  if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể lưu dữ liệu.");
  return body.data;
}

export function AttendanceSettings({ activeTab = "policy" }: { activeTab?: "policy" | "locations" }) {
  const [configuration, setConfiguration] = useState<Configuration>();
  const [policy, setPolicy] = useState<AttendancePolicy>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const [locationDraft, setLocationDraft] = useState({ name: "", latitude: "", longitude: "", radiusMeters: "200" });
  const load = async () => {
    try {
      const data = await readApi<Configuration>(await fetch("/api/v1/attendance/settings", { cache: "no-store" }));
      setConfiguration(data); setPolicy(data.policy); setError(undefined);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tải cấu hình."); }
  };
  useEffect(() => { queueMicrotask(() => void load()); }, []);
  if (!configuration || !policy) {
    return error ? <ErrorState description={error} /> : <LoadingState />;
  }
  const patchPolicy = <K extends keyof AttendancePolicy>(key: K, value: AttendancePolicy[K]) => setPolicy({ ...policy, [key]: value });
  const savePolicy = async () => {
    try {
      const updated = await readApi<AttendancePolicy>(await fetch("/api/v1/attendance/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attendanceEnabled: policy.attendanceEnabled, photoRequired: policy.photoRequired, gpsRequired: policy.gpsRequired, offlineEnabled: policy.offlineEnabled, allowedAccuracyThresholdMeters: policy.allowedAccuracyThresholdMeters, earlyCheckinWindowMinutes: policy.earlyCheckinWindowMinutes, lateThresholdMinutes: policy.lateThresholdMinutes, shiftName: policy.shiftName, shiftStart: policy.shiftStart, shiftEnd: policy.shiftEnd }) }));
      setPolicy(updated); setSaved("Đã lưu chính sách chấm công."); setError(undefined);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể lưu."); }
  };
  const addLocation = async () => {
    try {
      await readApi<AttendanceLocation>(await fetch("/api/v1/attendance/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: locationDraft.name, latitude: Number(locationDraft.latitude), longitude: Number(locationDraft.longitude), radiusMeters: Number(locationDraft.radiusMeters), active: true }) }));
      setLocationDraft({ name: "", latitude: "", longitude: "", radiusMeters: "200" });
      setSaved("Đã thêm địa điểm chấm công."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể lưu địa điểm."); }
  };
  return <div className="attendance-page"><Tabs label="Cấu hình chấm công" items={[{ label: "Chính sách", href: "/settings/attendance", active: activeTab === "policy" }, { label: "Địa điểm", href: "/settings/attendance/locations", active: activeTab === "locations" }]} />{saved ? <div className="attendance-notice attendance-notice--success">{saved}</div> : null}{error ? <div className="attendance-notice" role="alert">{error}</div> : null}{activeTab === "policy" ? <Card><div className="attendance-setting-toggles">{([ ["attendanceEnabled", "Bật chấm công"], ["photoRequired", "Bắt buộc ảnh"], ["gpsRequired", "Bắt buộc GPS"], ["offlineEnabled", "Cho phép offline"] ] as const).map(([key, label]) => <label className="attendance-toggle" key={key}><input checked={policy[key]} onChange={(event) => patchPolicy(key, event.target.checked)} type="checkbox" /><span>{label}</span><StatusBadge tone={policy[key] ? "success" : "neutral"}>{policy[key] ? "Bật" : "Tắt"}</StatusBadge></label>)}</div><div className="attendance-settings-grid"><Input label="Tên ca" onChange={(event) => patchPolicy("shiftName", event.target.value)} value={policy.shiftName} /><Input label="Bắt đầu" onChange={(event) => patchPolicy("shiftStart", event.target.value)} type="time" value={policy.shiftStart} /><Input label="Kết thúc" onChange={(event) => patchPolicy("shiftEnd", event.target.value)} type="time" value={policy.shiftEnd} /><Input label="Độ chính xác GPS tối đa (m)" min={10} onChange={(event) => patchPolicy("allowedAccuracyThresholdMeters", Number(event.target.value))} type="number" value={policy.allowedAccuracyThresholdMeters} /><Input label="Ngưỡng đi trễ (phút)" min={0} onChange={(event) => patchPolicy("lateThresholdMinutes", Number(event.target.value))} type="number" value={policy.lateThresholdMinutes} /><Input label="Cho phép chấm sớm (phút)" min={0} onChange={(event) => patchPolicy("earlyCheckinWindowMinutes", Number(event.target.value))} type="number" value={policy.earlyCheckinWindowMinutes} /></div><div className="action-row"><Button leftIcon={<Save size={16} />} onClick={() => void savePolicy()} variant="primary">Lưu chính sách</Button></div></Card> : <div className="attendance-location-settings"><Card><h3>Địa điểm đang hoạt động</h3><div className="attendance-location-list">{configuration.locations.map((location) => <div key={location.id}><MapPin size={18} /><strong>{location.name}</strong><span>{location.radiusMeters} m</span><StatusBadge tone={location.active ? "success" : "neutral"}>{location.active ? "Hoạt động" : "Tắt"}</StatusBadge></div>)}</div></Card><Card><h3>Thêm địa điểm</h3><div className="attendance-settings-grid"><Input label="Tên địa điểm" onChange={(event) => setLocationDraft({ ...locationDraft, name: event.target.value })} value={locationDraft.name} /><Input label="Vĩ độ" onChange={(event) => setLocationDraft({ ...locationDraft, latitude: event.target.value })} step="any" type="number" value={locationDraft.latitude} /><Input label="Kinh độ" onChange={(event) => setLocationDraft({ ...locationDraft, longitude: event.target.value })} step="any" type="number" value={locationDraft.longitude} /><Input label="Bán kính (m)" min={10} onChange={(event) => setLocationDraft({ ...locationDraft, radiusMeters: event.target.value })} type="number" value={locationDraft.radiusMeters} /></div><Button disabled={!locationDraft.name || !locationDraft.latitude || !locationDraft.longitude} leftIcon={<Plus size={16} />} onClick={() => void addLocation()} variant="primary">Thêm địa điểm</Button></Card></div>}</div>;
}
