export function overtimeTimeRange(date: string, start: string, end: string, nextDay: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return { checkedInAt: "", checkedOutAt: "", minutes: 0 };
  const checkedInAt = `${date}T${start}:00+07:00`;
  const endDate = nextDay ? new Date(Date.parse(`${date}T12:00:00Z`) + 86400_000).toISOString().slice(0, 10) : date;
  const checkedOutAt = `${endDate}T${end}:00+07:00`;
  const minutes = Math.floor((Date.parse(checkedOutAt) - Date.parse(checkedInAt)) / 60_000);
  return { checkedInAt, checkedOutAt, minutes: Number.isFinite(minutes) ? minutes : 0 };
}

export function overtimeDurationLabel(minutes: number) {
  const value = Math.max(0, Math.floor(minutes));
  return `${Math.floor(value / 60)} giờ${value % 60 ? ` ${value % 60} phút` : ""}`;
}
