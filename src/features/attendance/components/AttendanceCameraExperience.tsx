"use client";

import {
  Camera,
  CameraOff,
  CheckCircle2,
  Clock3,
  History,
  MapPin,
  RefreshCcw,
  RotateCcw,
  SwitchCamera,
  Wifi,
  WifiOff,
  X
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button, IconButton } from "@/components/shared/Button";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { captureAttendancePhoto, type ProcessedAttendancePhoto } from "@/features/attendance/client/imageProcessing";
import { countPendingAttendance, listPendingAttendance, savePendingAttendance } from "@/features/attendance/client/attendanceQueue";
import { AttendanceSyncError, syncAttendanceItem } from "@/features/attendance/client/attendanceSync";
import { matchAttendanceLocation } from "@/features/attendance/services/attendanceRules";
import type { AttendanceCoordinates, AttendanceDashboard, PendingAttendanceItem } from "@/features/attendance/types/attendanceTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

type CaptureStep = "home" | "camera" | "preview" | "saving" | "success";
type PermissionState = "idle" | "requesting" | "ready" | "denied" | "unavailable";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
}

function formatTime(value: string | Date, includeSeconds = false) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hour12: false
  }).format(typeof value === "string" ? new Date(value) : value);
}

function errorMessage(error: unknown): string {
  if (error instanceof AttendanceSyncError) return error.message;
  if (error instanceof DOMException && error.name === "NotAllowedError") return "Hãy cho phép trình duyệt sử dụng camera để chấm công.";
  return error instanceof Error ? error.message : "Không thể hoàn tất thao tác. Vui lòng thử lại.";
}

export function AttendanceCameraExperience() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [dashboard, setDashboard] = useState<AttendanceDashboard>();
  const [loadError, setLoadError] = useState<string>();
  const [step, setStep] = useState<CaptureStep>("home");
  const [cameraState, setCameraState] = useState<PermissionState>("idle");
  const [locationState, setLocationState] = useState<PermissionState>("idle");
  const [coordinates, setCoordinates] = useState<AttendanceCoordinates>();
  const [photo, setPhoto] = useState<ProcessedAttendancePhoto>();
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [now, setNow] = useState(() => new Date());
  const [pendingCount, setPendingCount] = useState(0);
  const [notice, setNotice] = useState<string>();
  const [successSynced, setSuccessSynced] = useState(false);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/attendance/dashboard", { cache: "no-store" });
      const body = await response.json() as { ok: boolean; data?: AttendanceDashboard; error?: { message: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải trạng thái chấm công.");
      setDashboard(body.data);
      setLoadError(undefined);
      setPendingCount(await countPendingAttendance(body.data.accountId));
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, []);
  useDomainReconciliation("attendance", loadDashboard);

  const syncPending = useCallback(async (manual = false) => {
    if (!dashboard || !navigator.onLine) return;
    const items = await listPendingAttendance(dashboard.accountId);
    for (const item of items) {
      if (!manual && item.nextRetryAt && new Date(item.nextRetryAt).getTime() > Date.now()) continue;
      try {
        await syncAttendanceItem(item);
      } catch (error) {
        setNotice(errorMessage(error));
      }
    }
    setPendingCount(await countPendingAttendance(dashboard.accountId));
    await loadDashboard();
  }, [dashboard, loadDashboard]);

  useEffect(() => { queueMicrotask(() => void loadDashboard()); }, [loadDashboard]);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (online && dashboard) queueMicrotask(() => void syncPending());
  }, [dashboard?.accountId, online]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => {
    stopCamera();
    if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
  }, [photo?.previewUrl, stopCamera]);

  const requestLocation = useCallback(() => {
    setLocationState("requesting");
    if (!navigator.geolocation) { setLocationState("unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString()
        });
        setLocationState("ready");
      },
      (error) => setLocationState(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 }
    );
  }, []);

  const startCamera = useCallback(async (nextFacingMode = facingMode) => {
    setCameraState("requesting");
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) { setCameraState("unavailable"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: nextFacingMode }, width: { ideal: 1600 }, height: { ideal: 1200 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("ready");
    } catch (error) {
      setCameraState(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "unavailable");
    }
  }, [facingMode, stopCamera]);

  const openCapture = () => {
    setNotice(undefined);
    setStep("camera");
    setCoordinates(undefined);
    requestLocation();
    void startCamera();
  };

  const closeCapture = () => {
    stopCamera();
    if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    setPhoto(undefined);
    setStep("home");
  };

  const takePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const processed = await captureAttendancePhoto(videoRef.current);
      setPhoto(processed);
      stopCamera();
      setStep("preview");
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  const retake = () => {
    if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    setPhoto(undefined);
    setStep("camera");
    void startCamera();
  };

  const submitPhoto = async () => {
    if (!dashboard || !photo || dashboard.nextAction === "completed") return;
    const locationMatch = matchAttendanceLocation(coordinates, dashboard.locations, dashboard.policy);
    if (dashboard.policy.gpsRequired && locationMatch.status !== "valid") {
      setNotice(locationMatch.status === "accuracy_low" ? "Vị trí chưa đủ chính xác. Hãy đứng ở khu vực thoáng và thử lại." : "Bạn đang ở ngoài phạm vi chấm công cho phép.");
      return;
    }
    setStep("saving");
    const capturedAtClient = new Date().toISOString();
    const item: PendingAttendanceItem = {
      clientEventId: crypto.randomUUID(),
      ownerAccountId: dashboard.accountId,
      intendedType: dashboard.nextAction,
      capturedAtClient,
      capturedOffline: !online,
      location: coordinates,
      deviceMetadata: { platform: navigator.platform, browser: navigator.userAgent, appVersion: "0.1.0" },
      photo: photo.photo,
      thumbnail: photo.thumbnail,
      photoWidth: photo.width,
      photoHeight: photo.height,
      createdAt: capturedAtClient,
      retryCount: 0,
      syncState: "local_pending"
    };
    try {
      await savePendingAttendance(item);
      setPendingCount(await countPendingAttendance(dashboard.accountId));
      setStep("success");
      setSuccessSynced(false);
      if (online) {
        try {
          await syncAttendanceItem(item);
          setSuccessSynced(true);
          setPendingCount(await countPendingAttendance(dashboard.accountId));
          await loadDashboard();
        } catch (error) {
          setNotice(errorMessage(error));
        }
      }
    } catch {
      setNotice("Thiết bị không thể lưu dữ liệu chấm công. Chưa có lượt chấm nào được ghi nhận.");
      setStep("preview");
    }
  };

  if (!dashboard && !loadError) return <LoadingState title="Đang tải chấm công" description="Đang kiểm tra ca làm và trạng thái hôm nay." />;
  if (!dashboard) return loadError?.includes("chưa liên kết")
    ? <ErrorState title="Tài khoản này chưa được liên kết với hồ sơ nhân viên" description="Chức năng chấm công cá nhân chưa khả dụng." />
    : <ErrorState title="Không thể mở chấm công" description={loadError} action={<Button onClick={() => void loadDashboard()}>Thử lại</Button>} />;

  const match = matchAttendanceLocation(coordinates, dashboard.locations, dashboard.policy);
  const nextLabel = dashboard.nextAction === "check_in" ? "Chấm vào" : dashboard.nextAction === "check_out" ? "Chấm ra" : "Đã hoàn tất";

  return (
    <div className="attendance-page">
      {notice ? <div className="attendance-notice" role="alert"><span>{notice}</span><IconButton label="Đóng thông báo" onClick={() => setNotice(undefined)}><X size={16} /></IconButton></div> : null}
      {dashboard.incompletePreviousDate ? <div className="attendance-warning">Bạn đang có một ngày chấm công chưa hoàn tất: {dashboard.incompletePreviousDate}.</div> : null}
      {pendingCount > 0 ? (
        <div className="attendance-pending-bar">
          <span>{pendingCount} lượt đang chờ đồng bộ</span>
          <Button disabled={!online} leftIcon={<RefreshCcw size={16} />} onClick={() => void syncPending(true)} size="sm">Thử lại</Button>
        </div>
      ) : null}

      {step === "home" ? (
        <div className="attendance-home-grid">
          <section className="attendance-clock-card" aria-label="Thời gian và ca làm hôm nay">
            <span className="attendance-date">{new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(now)}</span>
            <strong>{formatTime(now, true)}</strong>
            <div className="attendance-shift"><Clock3 size={18} /><span>{dashboard.policy.shiftName}</span><b>{dashboard.policy.shiftStart} – {dashboard.policy.shiftEnd}</b></div>
          </section>
          <section className="attendance-status-card" aria-label="Trạng thái sẵn sàng và dòng thời gian hôm nay">
            <div className="attendance-status-row"><MapPin size={18} /><span>{dashboard.locations.map((location) => location.name).join(", ") || "Chưa gán địa điểm"}</span><StatusBadge tone="neutral">GPS khi mở camera</StatusBadge></div>
            <div className="attendance-status-row">{online ? <Wifi size={18} /> : <WifiOff size={18} />}<span>{online ? "Kết nối sẵn sàng" : "Không có mạng"}</span><StatusBadge tone={online ? "success" : "warning"}>{online ? "Trực tuyến" : "Ngoại tuyến"}</StatusBadge></div>
            <h2 className="attendance-timeline-title">Dòng thời gian hôm nay</h2>
            <div className="attendance-today-events">
              {dashboard.todayEvents.length ? dashboard.todayEvents.map((event) => (
                <div key={event.id}><span>{event.eventType === "check_in" ? "Chấm vào" : "Chấm ra"}</span><strong>{formatTime(event.effectiveAt)}</strong><StatusBadge tone={event.syncStatus === "synced" ? "success" : "warning"}>{event.syncStatus === "synced" ? "Đã đồng bộ" : "Chờ đồng bộ"}</StatusBadge></div>
              )) : <span>Chưa có lượt chấm hôm nay</span>}
            </div>
            <Button className="attendance-primary-action" disabled={dashboard.nextAction === "completed" || !dashboard.policy.attendanceEnabled} leftIcon={<Camera size={20} />} onClick={openCapture} size="lg" variant="primary">{nextLabel}</Button>
            {dashboard.lastEvent ? <Link className="attendance-last-link" href={`/attendance/history/${dashboard.lastEvent.attendanceDate}`}><History size={16} />Lần gần nhất: {formatTime(dashboard.lastEvent.effectiveAt)} · {dashboard.lastEvent.eventType === "check_in" ? "Chấm vào" : "Chấm ra"}</Link> : null}
          </section>
        </div>
      ) : null}

      {step === "camera" ? (
        <section className="attendance-capture-card" aria-label="Chụp ảnh chấm công">
          <div className="attendance-camera-toolbar"><strong>{nextLabel}</strong><IconButton label="Đóng camera" onClick={closeCapture}><X size={20} /></IconButton></div>
          <div className="attendance-live-preview">
            <video muted playsInline ref={videoRef} />
            {cameraState !== "ready" ? <div className="attendance-camera-state">{cameraState === "requesting" ? <RefreshCcw className="spin" size={28} /> : <CameraOff size={30} />}<span>{cameraState === "denied" ? "Không thể truy cập camera. Hãy cấp quyền camera và thử lại." : cameraState === "unavailable" ? "Camera không khả dụng trên thiết bị này." : "Đang mở camera..."}</span></div> : null}
          </div>
          <div className="attendance-capture-status">
            <span><MapPin size={16} />{locationState === "requesting" ? "Đang xác định vị trí..." : locationState === "denied" ? "Chưa có quyền vị trí" : match.status === "valid" ? `${match.location?.name} · Vị trí hợp lệ` : match.status === "accuracy_low" ? "GPS chưa đủ chính xác" : locationState === "ready" ? "Ngoài phạm vi cho phép" : "Không thể xác định vị trí"}</span>
            <span>{online ? <Wifi size={16} /> : <WifiOff size={16} />}{online ? "Đã kết nối" : "Không có mạng"}</span>
          </div>
          <div className="attendance-capture-actions">
            <IconButton label="Đổi camera" onClick={() => { const next = facingMode === "user" ? "environment" : "user"; setFacingMode(next); void startCamera(next); }}><SwitchCamera size={22} /></IconButton>
            <button aria-label="Chụp ảnh" className="capture-button" disabled={cameraState !== "ready"} onClick={() => void takePhoto()} type="button"><span /></button>
            <IconButton label="Thử lại GPS" onClick={requestLocation}><RefreshCcw size={20} /></IconButton>
          </div>
        </section>
      ) : null}

      {step === "preview" && photo ? (
        <section className="attendance-photo-review" aria-label="Kiểm tra ảnh chấm công">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Ảnh chấm công vừa chụp" src={photo.previewUrl} />
          <div className="attendance-capture-status"><span><MapPin size={16} />{match.status === "valid" ? `${match.location?.name} · Vị trí hợp lệ` : "Vị trí chưa hợp lệ"}</span><span>{online ? <Wifi size={16} /> : <WifiOff size={16} />}{online ? "Đã kết nối" : "Sẽ lưu trên thiết bị"}</span></div>
          <div className="action-row"><Button leftIcon={<RotateCcw size={16} />} onClick={retake}>Chụp lại</Button><Button disabled={dashboard.policy.gpsRequired && match.status !== "valid"} leftIcon={<CheckCircle2 size={16} />} onClick={() => void submitPhoto()} variant="primary">Sử dụng ảnh</Button></div>
        </section>
      ) : null}

      {step === "saving" ? <LoadingState title="Đang ghi nhận..." description="Đang lưu dữ liệu an toàn trên thiết bị." /> : null}
      {step === "success" ? (
        <section className="attendance-success-card"><CheckCircle2 size={52} /><h2>{successSynced ? "Máy chủ đã xác nhận" : "Đã lưu trên thiết bị"}</h2><strong>{formatTime(now)}</strong><span>{match.location?.name}</span><StatusBadge tone={successSynced ? "success" : "warning"}>{successSynced ? "Đã đồng bộ" : "Chờ đồng bộ"}</StatusBadge><Button onClick={closeCapture}>Về màn hình hôm nay</Button></section>
      ) : null}
    </div>
  );
}
