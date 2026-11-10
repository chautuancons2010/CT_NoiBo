"use client";

import { Check, RefreshCw, Trash2, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BackLink } from "@/components/shared/BackLink";
import { Button, IconButton } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Checkbox, Input, SearchInput, Select, Textarea } from "@/components/shared/FormControls";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { processAttendanceImage } from "@/features/attendance/client/imageProcessing";
import { lookupAttendanceAddress } from "@/features/attendance/client/attendanceAddressClient";
import { captureAttendanceLocation } from "@/features/attendance/client/locationCapture";
import { AttendanceLocationAddress } from "@/features/attendance/components/AttendanceLocationAddress";
import { WorkerSelector } from "@/features/employees/components/EmployeePicker";
import type { EmployeePickerOption } from "@/features/employees/types";
import { deleteWorkerDraft, getWorkerDraft, saveWorkerDraft, type LocalWorkerPhoto, type WorkerLocalDraft } from "@/features/worker-attendance/client/workerDraftStore";
import { fetchWorkerSession, readWorkerResponse, syncWorkerDraft } from "@/features/worker-attendance/client/workerAttendanceSync";
import { countWorkerAttendance, validateSessionForSubmit } from "@/features/worker-attendance/services/workerAttendanceRules";
import type { WorkerAttendanceEntry, WorkerAttendanceSession, WorkerEntryStatus, WorkerSafetyReport } from "@/features/worker-attendance/types/workerAttendanceTypes";
import { createWorkerSafetyReport, validateWorkerSafetyReport } from "../services/workerSafetyReport";
import { WorkerSafetyReportEditor, WorkerSafetyReportView } from "./WorkerSafetyReport";

import { formatBusinessDate } from "@/lib/time/timezone";
import styles from "./WorkerAttendanceWorkspace.module.css";

type WizardStep = "roster" | "photos" | "review";

const statuses: Array<{ value: WorkerEntryStatus; label: string }> = [
  { value: "unconfirmed", label: "Chưa xác nhận" }, { value: "present", label: "Có mặt" },
  { value: "late", label: "Đi trễ" }, { value: "absent", label: "Vắng" },
  { value: "leave", label: "Nghỉ phép" }, { value: "transferred", label: "Điều chuyển" }
];
const stepLabels: Record<WizardStep, string> = { roster: "Công nhân", photos: "Chụp ảnh", review: "An toàn" };

function route(id: string, step: WizardStep) { return `/worker-attendance/sessions/${id}/${step}`; }

function DraftPhoto({ photo }: { photo: Blob }) {
  const [url] = useState(() => URL.createObjectURL(photo));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <Image alt="Ảnh điểm danh chưa đồng bộ" height={240} src={url} unoptimized width={320} />;
}

export function WorkerAttendanceWizard({ sessionId, step: initialStep, employeeOptions = [] }: { sessionId: string; step: WizardStep; employeeOptions?: EmployeePickerOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const stepRef = useRef(initialStep);
  const [draft, setDraft] = useState<WorkerLocalDraft>();
  const draftRef = useRef<WorkerLocalDraft | undefined>(undefined);
  const draftWrites = useRef<Promise<void>>(Promise.resolve());
  const navigationBusy = useRef(false);
  const backgroundSync = useRef<Promise<void> | null>(null);
  const lastAttemptedAt = useRef<string | undefined>(undefined);
  const [syncRevision, setSyncRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [onlyUnprocessed, setOnlyUnprocessed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showTemporary, setShowTemporary] = useState(false);
  const [selectedExistingId, setSelectedExistingId] = useState<string>();
  const [existingReason, setExistingReason] = useState("support");
  const [photoFile, setPhotoFile] = useState<File>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  const locationRequest = useRef<Promise<void> | null>(null);
  const locationCapturedAt = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const restoreStep = () => {
      const last = window.location.pathname.split("/").at(-1) as WizardStep;
      if (["roster", "review", "photos"].includes(last)) { stepRef.current = last; setStep(last); }
    };
    window.addEventListener("popstate", restoreStep);
    return () => window.removeEventListener("popstate", restoreStep);
  }, []);

  const load = useCallback(async () => {
    try {
      const stored = await getWorkerDraft(sessionId);
      const local = stored?.session.selectionMode && !stored.session.safetyReport ? { ...stored, session: { ...stored.session, safetyReport: createWorkerSafetyReport() } } : stored;
      if (local) {
        draftRef.current = local;
        setDraft(local);
        if (local.pendingSubmit && navigator.onLine) {
          const session = await syncWorkerDraft(local);
          router.replace(`/worker-attendance/sessions/${session.id}`);
        }
        return;
      }
      if (sessionId.startsWith("local-")) throw new Error("Không tìm thấy bản nháp trên thiết bị này.");
      const session = await fetchWorkerSession(sessionId);
      if (session.submittedAt || session.status === "submitted" || session.status === "locked") { router.replace(`/worker-attendance/sessions/${session.id}`); return; }
      const value: WorkerLocalDraft = { id: session.id, ownerAccountId: "server", clientSessionId: session.clientSessionId, session: session.selectionMode && !session.safetyReport ? { ...session, safetyReport: createWorkerSafetyReport() } : session, photos: [], pendingSubmit: false, retryCount: 0, updatedAt: new Date().toISOString() };
      await saveWorkerDraft(value); draftRef.current = value; setDraft(value);
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Không thể mở phiên điểm danh."); }
  }, [router, sessionId]);
  useEffect(() => {
    // Restore the device draft before falling back to the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!draft?.pendingSubmit) return;
    const retry = () => {
      void syncWorkerDraft(draft).then((session) => router.replace(`/worker-attendance/sessions/${session.id}`)).catch(() => undefined);
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [draft, router]);

  async function update(next: WorkerLocalDraft) {
    draftRef.current = next;
    setDraft(next);
    const saved = draftWrites.current.catch(() => undefined).then(() => saveWorkerDraft(next));
    draftWrites.current = saved;
    await saved;
  }

  useEffect(() => {
    if (!draft || draft.pendingSubmit || busy || photoBusy || !navigator.onLine || lastAttemptedAt.current === draft.updatedAt) return;
    const timer = window.setTimeout(() => {
      if (backgroundSync.current || navigationBusy.current) return;
      const run = async () => {
        await draftWrites.current;
        const snapshot = draftRef.current;
        if (!snapshot) return;
        try {
          const session = await syncWorkerDraft(snapshot);
          const latest = draftRef.current;
          if (!latest || latest.pendingSubmit) return;
          const unchanged = latest === snapshot;
          const localByWorker = new Map(latest.session.entries.map(entry => [entry.workerId, entry]));
          const next = { ...latest, id: session.id, session: unchanged ? session : { ...session, entries: session.entries.map(entry => ({ ...entry, ...localByWorker.get(entry.workerId), id: entry.id, sessionId: session.id, checkedInAt: entry.checkedInAt, checkedOutAt: entry.checkedOutAt })), checklistResponses: latest.session.checklistResponses, safetyConfirmed: latest.session.safetyConfirmed, safetyReport: latest.session.safetyReport, workNote: latest.session.workNote }, photos: latest.photos.filter(photo => !photo.uploaded && !session.photos.some(saved => saved.id === photo.id)) };
          await update(next);
          if (mounted.current && latest.id !== session.id) window.history.replaceState(null, "", route(session.id, stepRef.current));
        } catch (error) {
          const latest = draftRef.current;
          if (latest) {
            draftRef.current = { ...latest, session: { ...latest.session, syncStatus: "sync_failed" } }; setDraft(draftRef.current);
            setMessage(error instanceof Error ? `${error.message} Đã lưu trên thiết bị.` : "Chưa đồng bộ. Đã lưu trên thiết bị.");
          }
        }
      };
      const startedAt = draftRef.current?.updatedAt;
      lastAttemptedAt.current = startedAt;
      backgroundSync.current = run().finally(() => { backgroundSync.current = null; if (draftRef.current?.updatedAt !== startedAt) setSyncRevision(value => value + 1); });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, busy, photoBusy, syncRevision]);

  useEffect(() => {
    const retry = () => { lastAttemptedAt.current = undefined; setSyncRevision(value => value + 1); };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);

  function reportDraftError() {
    setMessage("Chưa lưu được điểm danh trên thiết bị. Vui lòng chọn lại trạng thái để thử lại.");
  }

  function retryLocation(): Promise<void> {
    if (locationRequest.current) return locationRequest.current;
    const pending = captureLocation().finally(() => { if (locationRequest.current === pending) locationRequest.current = null; });
    locationRequest.current = pending;
    return pending;
  }
  async function captureLocation() {
    if (!draftRef.current) return;
    setLocationBusy(true); setLocationError("");
    try {
      const coordinates = await captureAttendanceLocation(navigator.geolocation, window.isSecureContext, { targetAccuracyMeters: 100, maxWaitMs: 10_000 });
      locationCapturedAt.current = Date.parse(coordinates.capturedAt);
      void lookupAttendanceAddress(coordinates);
      const location = { latitude: coordinates.latitude, longitude: coordinates.longitude, accuracy: coordinates.accuracy };
      const current = draftRef.current!;
      await update({ ...current, location, session: { ...current.session, latitude: location.latitude, longitude: location.longitude, accuracyMeters: location.accuracy, worksiteAddress: undefined, geofenceStatus: "valid" }, updatedAt: new Date().toISOString() });
    } catch (caught) { setLocationError(caught instanceof Error ? caught.message : "Chưa xác định được GPS."); }
    finally { setLocationBusy(false); }
  }

  function updateEntry(entryId: string, patch: Partial<WorkerAttendanceEntry>) {
    const current = draftRef.current;
    if (!current || navigationBusy.current || current.pendingSubmit) return;
    setMessage("");
    const next = { ...current, session: { ...current.session, safetyConfirmed: current.session.selectionMode ? false : current.session.safetyConfirmed, entries: current.session.entries.map((entry) => entry.id === entryId ? { ...entry, ...patch } : entry) }, updatedAt: new Date().toISOString() };
    void update(next).catch(reportDraftError);
  }

  function markAllPresent() {
    const current = draftRef.current;
    if (!current || navigationBusy.current || current.pendingSubmit) return;
    setMessage("");
    void update({ ...current, session: { ...current.session, entries: current.session.entries.map((entry) => entry.status === "leave" && entry.exceptionReason === "approved_leave" ? entry : { ...entry, status: "present", exceptionReason: undefined }) }, updatedAt: new Date().toISOString() }).catch(reportDraftError);
  }

  function updateChecklist(itemId: string, checked: boolean) {
    const latest = draftRef.current;
    if (!latest || navigationBusy.current || latest.pendingSubmit) return;
    const current = latest.session.checklistResponses.filter((response) => response.itemId !== itemId);
    const next = { ...latest, session: { ...latest.session, safetyConfirmed: latest.session.selectionMode ? false : latest.session.safetyConfirmed, checklistResponses: [...current, { itemId, checked }] }, updatedAt: new Date().toISOString() };
    void update(next).catch(reportDraftError);
  }

  function updateSafetyReport(report: WorkerSafetyReport, workNote?: string) {
    const current = draftRef.current;
    if (!current || navigationBusy.current || current.pendingSubmit) return;
    setMessage("");
    void update({ ...current, session: { ...current.session, safetyReport: report, workNote: workNote ?? current.session.workNote, safetyConfirmed: false }, updatedAt: new Date().toISOString() }).catch(reportDraftError);
  }

  async function saveAndGo(nextStep: WizardStep) {
    if (!draftRef.current || navigationBusy.current || photoBusy) return;
    navigationBusy.current = true;
    setBusy(true); setMessage("");
    try {
      await draftWrites.current;
      const current = draftRef.current;
      if (!current) return;
      if (current.session.selectionMode && nextStep !== "roster") {
        if (!current.session.entries.some((entry) => entry.isSelected && (entry.status === "present" || entry.status === "late"))) { setMessage("Chọn ít nhất một công nhân."); return; }
        if (nextStep === "photos") {
          const errors = validateWorkerSafetyReport(current.session.safetyReport, current.session.workNote);
          if (!current.session.checklist.every(item => !item.required || current.session.checklistResponses.some(response => response.itemId === item.id && response.checked))) errors.push("Chưa chọn đủ chuẩn an toàn bắt buộc.");
          if (errors.length) { setMessage(errors.join(" ")); return; }
          // The primary action explicitly confirms this exact report. A second,
          // separately reset checkbox must not strand an otherwise complete form.
          await update({ ...current, session: { ...current.session, safetyConfirmed: true }, updatedAt: new Date().toISOString() });
        }
      }
      stepRef.current = nextStep;
      setStep(nextStep);
      window.history.pushState(null, "", route(draftRef.current?.id ?? current.id, nextStep));
      if (nextStep === "photos") void retryLocation();
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (caught) {
      const current = draftRef.current;
      const recovered = current ? await getWorkerDraft(current.id).catch(() => undefined) : undefined;
      if (recovered) { draftRef.current = recovered; setDraft(recovered); }
      setMessage(caught instanceof Error ? `${caught.message} Bản nháp vẫn còn trên thiết bị.` : "Bản nháp vẫn còn trên thiết bị.");
    }
    finally { navigationBusy.current = false; setBusy(false); }
  }

  async function saveRoster() {
    if (!draftRef.current || navigationBusy.current) return;
    navigationBusy.current = true;
    setBusy(true); setMessage("");
    try {
      await draftWrites.current;
      await backgroundSync.current;
      const current = draftRef.current;
      if (!current) return;
      if (!navigator.onLine) { setMessage("Đã lưu điểm danh trên thiết bị."); return; }
      const session = await syncWorkerDraft(current);
      // Keep the visible roster in place when the database returns updated rows.
      const order = new Map(current.session.entries.map((entry, index) => [entry.workerId, index]));
      const entries = [...session.entries].sort((first, second) => (order.get(first.workerId) ?? Number.MAX_SAFE_INTEGER) - (order.get(second.workerId) ?? Number.MAX_SAFE_INTEGER));
      await update({ ...current, id: session.id, session: { ...session, entries }, photos: [], retryCount: 0, updatedAt: new Date().toISOString() });
      setMessage("Đã lưu điểm danh.");
      if (session.id !== current.id) router.replace(route(session.id, "roster"));
    } catch (caught) { setMessage(caught instanceof Error ? `${caught.message} Bản nháp vẫn còn trên thiết bị.` : "Chưa đồng bộ được. Bản nháp vẫn còn trên thiết bị."); }
    finally { navigationBusy.current = false; setBusy(false); }
  }

  async function addPhoto(file?: File) {
    if (!draftRef.current || !file || photoBusy || navigationBusy.current || draftRef.current.pendingSubmit) return;
    setPhotoBusy(true); setPhotoError(""); setMessage("");
    try {
      const capturedAt = new Date().toISOString();
      if (!draftRef.current.location || Date.parse(capturedAt) - locationCapturedAt.current > 15_000) await retryLocation();
      const coordinates = draftRef.current.location;
      if (!coordinates) throw new Error("Chưa lấy được GPS. Bật quyền vị trí rồi bấm Thử lại.");
      const result = await lookupAttendanceAddress(coordinates);
      if (result.status !== "resolved" || !result.address) throw new Error("Chưa lấy được địa chỉ GPS. Giữ ảnh và bấm Thử lại.");
      const processed = await processAttendanceImage(file, { capturedAt, address: result.address, latitude: coordinates.latitude, longitude: coordinates.longitude, label: `CHÂU TUẤN · ${draftRef.current.session.projectName}` });
      URL.revokeObjectURL(processed.previewUrl);
      const photo: LocalWorkerPhoto = { id: crypto.randomUUID(), photo: processed.photo, thumbnail: processed.thumbnail, width: processed.width, height: processed.height, capturedAt, address: result.address, latitude: coordinates.latitude, longitude: coordinates.longitude, accuracy: coordinates.accuracy, uploaded: false };
      const current = draftRef.current!;
      await update({ ...current, location: { latitude: coordinates.latitude, longitude: coordinates.longitude, accuracy: coordinates.accuracy }, photos: [...current.photos, photo], session: { ...current.session, latitude: coordinates.latitude, longitude: coordinates.longitude, accuracyMeters: coordinates.accuracy, worksiteAddress: undefined, geofenceStatus: "valid", photoStatus: "pending_upload" }, updatedAt: new Date().toISOString() });
      setPhotoFile(undefined);
    } catch (caught) { setPhotoError(caught instanceof Error ? caught.message : "Không thể xử lý ảnh."); }
    finally { setPhotoBusy(false); }
  }

  async function addTemporary(formData: FormData) {
    if (!draft || draft.id.startsWith("local-")) { setMessage("Cần có mạng để thêm công nhân ngoài kế hoạch."); return; }
    setBusy(true); setMessage("");
    try {
      const session = await readWorkerResponse<WorkerAttendanceSession>(await fetch(`/api/v1/worker-attendance/sessions/${draft.id}/temporary-worker`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(formData)) }));
      await update({ ...draft, session, updatedAt: new Date().toISOString() }); setShowTemporary(false);
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Không thể thêm công nhân."); }
    finally { setBusy(false); }
  }

  async function addExisting() {
    if (!draft || !selectedExistingId || draft.id.startsWith("local-")) { setMessage("Cần có mạng và chọn một công nhân."); return; }
    setBusy(true); setMessage("");
    try {
      const session = await readWorkerResponse<WorkerAttendanceSession>(await fetch(`/api/v1/worker-attendance/sessions/${draft.id}/existing-worker`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workerId: selectedExistingId, unplannedReason: existingReason }) }));
      await update({ ...draft, session, updatedAt: new Date().toISOString() }); setSelectedExistingId(undefined); setShowTemporary(false);
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Không thể thêm công nhân."); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!draftRef.current || navigationBusy.current || draftRef.current.pendingSubmit || photoBusy || locationBusy) return;
    navigationBusy.current = true;
    setBusy(true); setMessage("");
    try {
      await draftWrites.current;
      await backgroundSync.current;
      const current = draftRef.current!;
      const errors = validateSessionForSubmit({ ...current.session, photoCount: current.session.photos.length + current.photos.length }, { minimumPhotos: current.session.selectionMode ? Math.max(1, current.session.minimumPhotos ?? 1) : 0, workNoteRequired: false, endOfDayRequired: false, offlineEnabled: true, editWindowMinutes: 0 });
      if (errors.length) { setMessage(errors.join(" ")); return; }
      const pending = { ...current, pendingSubmit: true, updatedAt: new Date().toISOString() };
      await update(pending);
      if (!navigator.onLine) { setMessage("Đã xếp hàng gửi khi có mạng."); return; }
      const session = await syncWorkerDraft(pending);
      await deleteWorkerDraft(current.id);
      router.replace(`/worker-attendance/sessions/${session.id}`);
    } catch (caught) {
      const latest = draftRef.current;
      if (latest) {
        const recovered = await getWorkerDraft(latest.id).catch(() => undefined);
        await update({ ...(recovered ?? latest), pendingSubmit: false }).catch(reportDraftError);
      }
      setMessage(caught instanceof Error ? caught.message : "Chưa thể gửi phiên.");
    }
    finally { navigationBusy.current = false; setBusy(false); }
  }

  const visibleEntries = useMemo(() => draft?.session.entries.filter((entry) => (!onlyUnprocessed || entry.status === "unconfirmed") && `${entry.employeeCode} ${entry.workerName}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))) ?? [], [draft, onlyUnprocessed, query]);
  const counts = useMemo(() => countWorkerAttendance(draft?.session.entries ?? []), [draft]);
  const checklistGroups = useMemo(() => {
    const groups = new Map<string, WorkerAttendanceSession["checklist"]>();
    for (const item of draft?.session.checklist ?? []) groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
    return [...groups.entries()];
  }, [draft]);
  if (!draft) return message ? <ErrorState description={message} action={<Button onClick={() => { setMessage(""); void load(); }}>Thử lại</Button>} /> : <LoadingState title="Đang mở phiên điểm danh" />;
  const selectionMode = draft.session.selectionMode === true;
  const selectedCount = draft.session.entries.filter((entry) => entry.isSelected && (entry.status === "present" || entry.status === "late")).length;
  const photoCount = draft.session.photos.length + draft.photos.length;
  const minimumPhotos = selectionMode ? Math.max(1, draft.session.minimumPhotos ?? 1) : 0;
  const requiredChecklistDone = draft.session.checklist.every((item) => !item.required || draft.session.checklistResponses.some((response) => response.itemId === item.id && response.checked));
  const reportErrors = validateWorkerSafetyReport(draft.session.safetyReport, draft.session.workNote);
  const locked = busy || draft.pendingSubmit || photoBusy;
  const safetyReady = requiredChecklistDone && !reportErrors.length;
  const safetyDone = draft.session.safetyConfirmed && safetyReady;
  const laterStepBlocked = selectionMode && step !== "roster" && (!selectedCount || (step === "photos" && !safetyDone));

  function toggleAllSelected() {
    const current = draftRef.current;
    if (!current || navigationBusy.current || current.pendingSubmit) return;
    const eligible = current.session.entries.filter((entry) => entry.exceptionReason !== "approved_leave");
    const select = !eligible.every((entry) => entry.isSelected);
    void update({ ...current, session: { ...current.session, safetyConfirmed: false, entries: current.session.entries.map((entry) => entry.exceptionReason === "approved_leave" ? entry : { ...entry, isSelected: select, status: select ? "present" : "unconfirmed", exceptionReason: undefined }) }, updatedAt: new Date().toISOString() }).catch(reportDraftError);
  }

  return (
    <div className={styles.wizard} data-step={step}>
      <BackLink href={step === "roster" ? "/worker-attendance/today" : route(draft.id, selectionMode ? step === "photos" ? "review" : "roster" : step === "photos" ? "roster" : "photos")} />
      <div className="worker-wizard__title"><div><h1>{draft.session.projectName}</h1><span>{draft.session.worksiteName} · {draft.session.shiftName} · {formatBusinessDate(draft.session.date)}</span></div><StatusBadge status={draft.session.syncStatus}>{draft.session.syncStatus === "synced" ? "Đã đồng bộ" : "Bản nháp"}</StatusBadge></div>
      <nav className="worker-steps" aria-label="Các bước điểm danh"><Link aria-disabled={locked} href="/worker-attendance/today" onClick={event => { if (locked) event.preventDefault(); }}><span>1</span>Gói</Link>{((selectionMode ? ["roster", "review", "photos"] : ["roster", "photos", "review"]) as WizardStep[]).map((item, index) => <button aria-current={step === item ? "step" : undefined} className={step === item ? "is-active" : ""} disabled={locked || (selectionMode && item !== "roster" && (!selectedCount || (item === "photos" && !safetyDone)))} key={item} onClick={() => void saveAndGo(item)} type="button"><span>{index + 2}</span>{stepLabels[item]}</button>)}</nav>
      {message ? <div className="form-message form-message--info" role="status">{message}</div> : null}

      {laterStepBlocked ? <ErrorState title={!selectedCount ? "Chưa chọn công nhân" : "Chưa xác nhận an toàn"} description="" action={<Button onClick={() => void saveAndGo(!selectedCount ? "roster" : "review")}>Quay lại</Button>} /> : null}

      {step === "roster" && selectionMode ? <>
        <Card className="worker-roster-card">
          <div className="worker-roster-actions"><SearchInput aria-label="Tìm công nhân" onChange={event => setQuery(event.target.value)} placeholder="Tên hoặc mã công nhân" value={query} /><Button disabled={locked || !draft.session.entries.length} onClick={toggleAllSelected} size="sm">{selectedCount ? "Chọn / bỏ chọn tất cả" : "Chọn tất cả"}</Button><span role="status">Đã chọn {selectedCount}/{draft.session.entries.length}</span></div>
          <div className={styles.workerChoices}>{visibleEntries.map(entry => <div className={styles.workerChoice} data-selected={entry.isSelected === true} key={entry.id}><Checkbox checked={entry.isSelected === true} disabled={locked || entry.exceptionReason === "approved_leave"} label={`${entry.workerName} · ${entry.employeeCode}`} onChange={event => updateEntry(entry.id, { isSelected: event.target.checked, status: event.target.checked ? "present" : "unconfirmed", exceptionReason: undefined })} />{entry.exceptionReason === "approved_leave" ? <StatusBadge tone="neutral">Nghỉ có phép</StatusBadge> : null}</div>)}</div>
          {!visibleEntries.length ? <p className={styles.emptySelection}>{query ? "Không tìm thấy công nhân." : "Gói chưa có công nhân."}</p> : null}
        </Card>
        <div className="sticky-action-bar"><Button disabled={locked || !selectedCount} busy={busy} onClick={() => void saveAndGo("review")} size="lg" variant="primary">Tiếp tục</Button></div>
      </> : null}

      {step === "roster" && !selectionMode ? <>
        <div className="worker-counts"><span>Tổng <strong>{counts.total}</strong></span><span>Có mặt <strong>{counts.present}</strong></span><span>Vắng <strong>{counts.absent + counts.leave}</strong></span><span>Chưa xác nhận <strong>{counts.unconfirmed}</strong></span></div>
        <Card className="worker-roster-card">
          <div className="worker-roster-actions"><SearchInput aria-label="Tìm công nhân" onChange={event => setQuery(event.target.value)} placeholder="Tên hoặc mã công nhân" value={query} /><Button aria-pressed={onlyUnprocessed} onClick={() => setOnlyUnprocessed((value) => !value)} size="sm" variant={onlyUnprocessed ? "soft" : "secondary"}>Chưa xử lý</Button><Button disabled={busy || draft.pendingSubmit || !draft.session.entries.length} onClick={markAllPresent} size="sm" variant="primary">Có mặt tất cả</Button></div>
          <div className="worker-roster-list">{visibleEntries.map((entry) => <article className="worker-roster-row" key={entry.id}><div><strong>{entry.workerName}</strong><small>{entry.employeeCode}</small>{entry.isUnplanned ? <span>Ngoài kế hoạch</span> : null}</div><div aria-label={`Điểm danh ${entry.workerName}`} className={styles.statusChips} role="group">{(["present", "leave", "absent", "late"] as WorkerEntryStatus[]).map((value) => <button aria-pressed={entry.status === value} data-status={value} className={entry.status === value ? "is-active" : ""} disabled={busy || draft.pendingSubmit} key={value} onClick={() => updateEntry(entry.id, { status: value, exceptionReason: value === "absent" ? "unknown" : value === "leave" ? "approved_leave" : undefined })} type="button">{entry.status === value ? <Check aria-hidden="true" size={13} /> : null}{statuses.find((item) => item.value === value)?.label}</button>)}</div>{entry.status === "absent" || entry.status === "leave" || entry.status === "transferred" ? <Select label={`Lý do ${entry.workerName}`} labelHidden className="select worker-row-reason" disabled={busy || draft.pendingSubmit} onChange={(event) => updateEntry(entry.id, { exceptionReason: event.target.value as WorkerAttendanceEntry["exceptionReason"] })} value={entry.exceptionReason ?? "unknown"} options={[{ label: "Có phép", value: "approved_leave" }, { label: "Không phép", value: "unapproved" }, { label: "Chưa rõ", value: "unknown" }, { label: "Công trường khác", value: "other_worksite" }, { label: "Khác", value: "other" }]} /> : null}</article>)}</div>
          <Button leftIcon={<UserPlus size={16} />} onClick={() => setShowTemporary((value) => !value)} variant="ghost">Thêm công nhân</Button>
          {showTemporary ? <div className="worker-add-person"><section><h4>Đã có hồ sơ</h4><WorkerSelector label="Tìm công nhân" onSelect={(option) => setSelectedExistingId(option.id)} options={employeeOptions} selectedId={selectedExistingId} /><Select label="Lý do" onChange={(event) => setExistingReason(event.target.value)} options={[{ value: "mobilized", label: "Điều động" }, { value: "support", label: "Hỗ trợ" }, { value: "replacement", label: "Thay thế" }, { value: "other", label: "Khác" }]} value={existingReason} /><Button disabled={busy || !selectedExistingId} onClick={() => void addExisting()} variant="primary">Thêm vào danh sách</Button></section><section><h4>Chưa có hồ sơ</h4><form action={addTemporary} className="worker-temporary-form"><Input label="Họ tên" name="fullName" required /><Input label="Số điện thoại" name="phone" /><Input label="Nhà thầu" name="contractorName" /><Select label="Lý do" name="unplannedReason" options={[{ value: "mobilized", label: "Điều động" }, { value: "support", label: "Hỗ trợ" }, { value: "replacement", label: "Thay thế" }, { value: "other", label: "Khác" }]} required /><Button disabled={busy} type="submit" variant="primary">Tạo và thêm</Button></form></section></div> : null}
        </Card>
        <div className="sticky-action-bar"><Button busy={busy} disabled={busy || draft.pendingSubmit} onClick={() => void saveRoster()} size="lg">Lưu điểm danh</Button><Button disabled={busy || draft.pendingSubmit || counts.unconfirmed > 0} onClick={() => void saveAndGo("photos")} size="lg" variant="primary">Tiếp tục {counts.total - counts.unconfirmed}/{counts.total}</Button></div>
      </> : null}

      {step === "photos" && !laterStepBlocked ? <>
        <Card><div className={styles.sectionHeading}><h2>Ảnh hiện trường</h2><span>{photoCount} ảnh{photoCount < minimumPhotos ? ` · Tối thiểu ${minimumPhotos}` : ""}</span></div><div className="worker-photo-grid">{draft.session.photos.map((photo, index) => <figure className={styles.photoTile} key={photo.id}><Image alt={`Ảnh hiện trường ${index + 1}`} height={240} src={`/api/v1/worker-attendance/photos/${photo.id}?size=thumbnail`} unoptimized width={320} /><figcaption>Ảnh {index + 1}</figcaption></figure>)}{draft.photos.map((photo, index) => <div className="worker-photo-local" key={photo.id}><DraftPhoto photo={photo.thumbnail} /><span className={styles.photoNumber}>{draft.session.photos.length + index + 1}</span><IconButton label="Xóa ảnh" onClick={() => void update({ ...draft, photos: draft.photos.filter((item) => item.id !== photo.id), updatedAt: new Date().toISOString() })}><Trash2 size={17} /></IconButton></div>)}</div><ImageUploader accept="image/*" capture="environment" className={styles.fieldCamera} disabled={locked} error={photoError} file={photoFile} label={photoCount ? "Chụp thêm ảnh hiện trường" : "Chụp ảnh điểm danh"} onFileChange={(file) => { setPhotoFile(file); setPhotoError(""); if (file) void addPhoto(file); }} onRetry={() => void addPhoto(photoFile)} uploading={photoBusy} />{photoBusy ? <span role="status">Đang ghi vị trí và thời gian lên ảnh…</span> : locationBusy ? <span role="status">Đang lấy GPS…</span> : null}{locationError ? <div className="form-message form-message--error" role="alert">{locationError}<Button disabled={locationBusy} onClick={() => void retryLocation()} size="sm">Thử lại GPS</Button></div> : null}</Card>
        <div className="sticky-action-bar"><Button disabled={locked || locationBusy || photoCount < minimumPhotos} busy={busy} onClick={() => selectionMode ? void submit() : void saveAndGo("review")} size="lg" variant="primary">{selectionMode ? "Gửi điểm danh" : "Tiếp tục"}</Button></div>
      </> : null}

      {step === "review" && !laterStepBlocked ? <>
        <Card>
          <div className={styles.sectionHeading}><h2>{selectionMode ? "An toàn lao động" : "Xác nhận điểm danh"}</h2></div>
          {selectionMode ? <WorkerSafetyReportEditor disabled={locked} onChange={updateSafetyReport} session={draft.session} /> : <><div className={styles.reviewGrid}>
            <span>{selectionMode ? "Đã chọn" : "Tổng"}<strong>{counts.total}</strong></span>
            <span>Có mặt<strong>{counts.present}</strong></span>
            {!selectionMode ? <><span>Đi trễ<strong>{counts.late}</strong></span><span>Vắng / nghỉ<strong>{counts.absent + counts.leave}</strong></span></> : null}
            <span>Ảnh<strong>{photoCount}</strong></span>
            <span>Vị trí<strong><AttendanceLocationAddress accuracyMeters={draft.session.accuracyMeters} emptyLabel={draft.session.geofenceStatus === "not_required" ? "Không yêu cầu" : "Chưa có GPS"} knownAddress={draft.session.worksiteAddress} latitude={draft.session.latitude} longitude={draft.session.longitude} referenceName={draft.session.worksiteName} /></strong></span>
          </div>
          <div className="action-row"><Button disabled={locationBusy || locked} leftIcon={<RefreshCw aria-hidden="true" size={16} />} onClick={() => void retryLocation()} busy={locationBusy}>Thử lại GPS</Button></div>
          {locationError ? <div className="form-message form-message--error" role="alert">{locationError}</div> : null}
          </>}
          {checklistGroups.length ? <div className="worker-checklist">{checklistGroups.map(([group, items]) => <fieldset key={group}><legend>{group}</legend>{items.map((item) => <Checkbox disabled={locked} checked={draft.session.checklistResponses.some((response) => response.itemId === item.id && response.checked)} key={item.id} label={`${item.content}${item.required ? " *" : ""}`} onChange={(event) => updateChecklist(item.id, event.target.checked)} />)}</fieldset>)}</div> : null}
          {!selectionMode ? <>
            <Textarea label="Nội dung công việc" onChange={event => void update({ ...draft, session: { ...draft.session, workNote: event.target.value }, updatedAt: new Date().toISOString() })} value={draft.session.workNote ?? ""} />
            <Textarea label="Ghi chú" onChange={event => void update({ ...draft, session: { ...draft.session, note: event.target.value }, updatedAt: new Date().toISOString() })} value={draft.session.note ?? ""} />
          </> : null}
        </Card>
        {selectionMode ? <WorkerSafetyReportView preview session={draft.session} /> : null}
        {selectionMode && !safetyReady ? <span role="status">{reportErrors[0] ?? "Chưa chọn đủ chuẩn an toàn bắt buộc"}</span> : null}
        <div className="sticky-action-bar"><Button disabled={locked || (selectionMode && !safetyReady)} onClick={() => selectionMode ? void saveAndGo("photos") : void submit()} size="lg" variant="primary" busy={busy}>{selectionMode ? "Xác nhận & chụp ảnh" : "Hoàn tất điểm danh"}</Button></div>
      </> : null}
    </div>
  );
}
