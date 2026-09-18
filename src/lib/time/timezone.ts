import { appConfig } from "@/config/app";

export function formatBusinessDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat(appConfig.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: appConfig.timezone
  }).format(date);
}

export function formatBusinessDate(value: Date | string): string {
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00+07:00`)
    : typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(appConfig.locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: appConfig.timezone
  }).format(date);
}

export function nowServerReceivedAt(): string {
  return new Date().toISOString();
}
