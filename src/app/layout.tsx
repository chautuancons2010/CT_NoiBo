import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { appConfig } from "@/config/app";

export const metadata: Metadata = {
  title: {
    default: appConfig.name,
    template: `%s | ${appConfig.shortName}`
  },
  description: "Nền tảng hệ thống nội bộ Châu Tuấn."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
