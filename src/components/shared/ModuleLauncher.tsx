"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

import { navigationIconMap } from "@/components/layout/icons";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { visibleApplications, type ApplicationDefinition } from "@/config/moduleRegistry";

export function ModuleIconCard({ application }: { application: ApplicationDefinition }) {
  const Icon = navigationIconMap[application.icon];
  const style = {
    "--module-accent": application.accentColor,
    "--module-surface": application.accentSoft
  } as CSSProperties;

  return (
    <Link className="module-icon-card" href={application.defaultRoute} style={style}>
      <span className="module-icon-card__icon"><Icon aria-hidden="true" size={23} strokeWidth={1.9} /></span>
      <strong>{application.label}</strong>
      <ArrowRight aria-hidden="true" className="module-icon-card__arrow" size={16} />
    </Link>
  );
}

export function ModuleLauncher() {
  const user = useCurrentUser();
  const { settings } = useSystemSettings();
  const [pinned, setPinned] = useState<string[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/workspace/preferences", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json(); setPinned(body.data?.pinnedModules ?? []);
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  const applications = visibleApplications(user, settings.modules).filter((application) => application.id !== "overview").sort((first, second) => {
    const firstIndex = pinned.indexOf(first.id), secondIndex = pinned.indexOf(second.id);
    if (firstIndex >= 0 && secondIndex >= 0) return firstIndex - secondIndex;
    if (firstIndex >= 0) return -1;
    if (secondIndex >= 0) return 1;
    return 0;
  });
  if (!applications.length) return null;

  return (
    <section aria-labelledby="my-modules-title" className="module-launcher">
      <header className="dashboard-section-heading">
        <h2 id="my-modules-title">Ứng dụng của tôi</h2>
      </header>
      <div className="module-launcher__grid">
        {applications.map((application) => <ModuleIconCard application={application} key={application.id} />)}
      </div>
    </section>
  );
}
