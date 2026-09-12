"use client";

import Image from "next/image";
import { useState } from "react";

export function LoginBrand({ logoUrl, shortName }: { logoUrl: string | null; shortName: string }) {
  const [failed, setFailed] = useState(false);
  if (!logoUrl || failed) return <div className="login-brand__fallback">{shortName}</div>;
  return <Image alt={shortName} className="login-brand__image" height={64} onError={() => setFailed(true)} priority src={logoUrl} unoptimized width={240} />;
}
