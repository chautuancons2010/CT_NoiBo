"use client";

import { listPendingAttendance } from "./attendanceQueue";
import { getNextAttendanceAction } from "@/features/attendance/services/attendanceRules";
import type { AttendanceDashboard, AttendanceEvent, PendingAttendanceItem } from "@/features/attendance/types/attendanceTypes";
import { getBusinessDateKey } from "@/lib/time/timezone";
import { hasAccurateLocation } from "../services/locationEvidence";

export function pendingAttendanceEvent(item: PendingAttendanceItem, employeeId: string): AttendanceEvent {
  const geofenceStatus = !item.location ? "unavailable" : hasAccurateLocation(item.location) ? "valid" : "accuracy_low";
  return {
    id: item.serverEventId ?? item.clientEventId,
    clientEventId: item.clientEventId,
    employeeId,
    eventType: item.intendedType,
    attendanceDate: getBusinessDateKey(new Date(item.capturedAtClient)),
    effectiveAt: item.capturedAtClient,
    capturedAtClient: item.capturedAtClient,
    receivedAtServer: item.capturedAtClient,
    latitude: item.location?.latitude,
    longitude: item.location?.longitude,
    accuracyMeters: item.location?.accuracy,
    geofenceStatus,
    attendanceStatus: geofenceStatus === "valid" ? "recorded" : "needs_review",
    photoStatus: "pending_upload",
    photoStamp: item.photoStamp,
    syncStatus: item.syncState,
    anomalyFlags: geofenceStatus === "valid" ? [] : [`gps_${geofenceStatus}`]
  };
}

export async function withPendingAttendance(dashboard: AttendanceDashboard): Promise<AttendanceDashboard> {
  const pending = await listPendingAttendance(dashboard.accountId);
  const today = getBusinessDateKey();
  const events = new Map(dashboard.todayEvents.filter((event) => event.attendanceDate === today).map((event) => [event.clientEventId, event]));
  for (const item of pending) {
    const event = pendingAttendanceEvent(item, dashboard.employeeId);
    if (event.attendanceDate === today && !events.has(event.clientEventId)) events.set(event.clientEventId, event);
  }
  const todayEvents = [...events.values()].sort((a, b) => a.effectiveAt.localeCompare(b.effectiveAt));
  return { ...dashboard, todayEvents, nextAction: getNextAttendanceAction(todayEvents) };
}
