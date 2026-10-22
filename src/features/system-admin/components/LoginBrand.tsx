"use client";

import Image from "next/image";
import { useState } from "react";

export function LoginBrand({ logoUrl, shortName }: { logoUrl: string | null; shortName: string }) {
  const [failed, setFailed] = useState(false);
  const resolvedLogo = logoUrl ?? "/brand/chau-tuan-logo.png";
  const officialLogo = resolvedLogo === "/brand/chau-tuan-logo.png";
  if (failed) return <div className="login-brand__fallback">{shortName}</div>;
  return <Image alt={shortName} className={officialLogo ? "login-brand__image login-brand__image--official" : "login-brand__image"} height={officialLogo ? 559 : 64} onError={() => setFailed(true)} priority src={resolvedLogo} unoptimized width={officialLogo ? 441 : 240} />;
}
