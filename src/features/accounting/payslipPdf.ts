import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";

import type { PayslipSettings } from "@/config/systemSettings";

type PayslipPdfInput = {
  employeeCode: string;
  employeeName: string;
  periodMonth: string;
  version: number;
  publishedAt?: string;
  snapshot: Record<string, unknown>;
  template?: PayslipSettings;
};

const number = (value: unknown) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value ?? 0));

function pdfColor(hex: string) {
  return rgb(...([1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255) as [number, number, number]));
}

export async function generatePayslipPdf(input: PayslipPdfInput): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const fontRoot = path.join(process.cwd(), "node_modules", "@fontsource", "inter", "files");
  const [regularBytes, semiboldBytes] = await Promise.all([
    readFile(path.join(fontRoot, "inter-latin-ext-400-normal.woff2")),
    readFile(path.join(fontRoot, "inter-latin-ext-600-normal.woff2"))
  ]);
  const regular = await document.embedFont(Uint8Array.from(regularBytes), { subset: false });
  const semibold = await document.embedFont(Uint8Array.from(semiboldBytes), { subset: false });
  const page = document.addPage([595.28, 841.89]);
  const dark = rgb(0.14, 0.19, 0.24);
  const muted = rgb(0.4, 0.45, 0.51);
  const template = input.template ?? {
    companyName: "CÔNG TY CHÂU TUẤN",
    title: "PHIẾU LƯƠNG THÁNG {month}",
    footer: "Tài liệu nội bộ · Dữ liệu lương riêng tư",
    primaryColor: "#2E9B67",
    showWorkDays: true,
    showBaseSalary: true,
    showAllowance: true,
    showBonus: true,
    showDeduction: true
  };
  const green = pdfColor(template.primaryColor);
  const left = 52;
  let y = 782;

  page.drawText(template.companyName, { x: left, y, font: semibold, size: 11, color: green });
  y -= 34;
  page.drawText(template.title.replace("{month}", input.periodMonth.slice(0, 7)), { x: left, y, font: semibold, size: 20, color: dark });
  y -= 24;
  page.drawText(`Phiên bản ${input.version}`, { x: left, y, font: regular, size: 9, color: muted });
  y -= 34;

  const field = (label: string, value: string) => {
    page.drawText(label, { x: left, y, font: regular, size: 10, color: muted });
    page.drawText(value, { x: 220, y, font: semibold, size: 10, color: dark });
    y -= 24;
  };
  field("Nhân viên", input.employeeName);
  field("Mã nhân viên", input.employeeCode);
  if (template.showWorkDays) field("Ngày công", String(input.snapshot.workDays ?? 0));
  if (template.showBaseSalary) field("Lương cơ bản", `${number(input.snapshot.baseSalary)} VND`);
  if (template.showAllowance) field("Phụ cấp", `${number(input.snapshot.allowance)} VND`);
  if (template.showBonus) field("Thưởng", `${number(input.snapshot.bonus)} VND`);
  if (template.showDeduction) field("Khấu trừ", `${number(input.snapshot.deduction)} VND`);
  y -= 8;
  page.drawRectangle({ x: left, y: y - 52, width: 491, height: 68, color: rgb(0.92, 0.97, 0.94), borderColor: rgb(0.72, 0.87, 0.78), borderWidth: 1 });
  page.drawText("THỰC NHẬN", { x: left + 18, y: y - 12, font: semibold, size: 11, color: muted });
  page.drawText(`${number(input.snapshot.netSalary)} VND`, { x: left + 18, y: y - 39, font: semibold, size: 20, color: green });
  y -= 92;
  field("Ngày phát hành", input.publishedAt ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(input.publishedAt)) : "—");
  page.drawText(template.footer, { x: left, y: 48, font: regular, size: 8, color: muted });
  return document.save();
}
