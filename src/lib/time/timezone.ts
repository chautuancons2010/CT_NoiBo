import { appConfig } from "@/config/app";

export function formatBusinessDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat(appConfig.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: appConfig.timezone
  }).format(date);
}

export function nowServerReceivedAt(): string {
  return new Date().toISOString();
}
