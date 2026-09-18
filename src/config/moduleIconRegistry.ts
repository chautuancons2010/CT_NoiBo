import type { NavigationIcon } from "@/config/navigation";

export type ApplicationId =
  | "overview"
  | "human-resources"
  | "attendance"
  | "projects"
  | "warehouse"
  | "import-export"
  | "accounting"
  | "messaging"
  | "operations"
  | "system";

export type ModuleIconTone = "green" | "blue" | "amber" | "purple" | "red" | "slate" | "teal";

export interface ModuleIconDefinition {
  icon: NavigationIcon;
  tone: ModuleIconTone;
  accentColor: string;
  accentSoft: string;
}

/** Single source of truth for module icon and color treatment. */
export const moduleIconRegistry: Record<ApplicationId, ModuleIconDefinition> = {
  overview: { icon: "LayoutDashboard", tone: "teal", accentColor: "#197c83", accentSoft: "var(--pastel-cyan)" },
  "human-resources": { icon: "Users", tone: "green", accentColor: "#218554", accentSoft: "var(--pastel-mint)" },
  attendance: { icon: "Clock3", tone: "blue", accentColor: "#386fc7", accentSoft: "var(--pastel-blue)" },
  projects: { icon: "BriefcaseBusiness", tone: "purple", accentColor: "#684fc4", accentSoft: "var(--pastel-lavender)" },
  warehouse: { icon: "Boxes", tone: "amber", accentColor: "#a56519", accentSoft: "var(--pastel-cream)" },
  "import-export": { icon: "Ship", tone: "teal", accentColor: "#197c83", accentSoft: "var(--pastel-cyan)" },
  accounting: { icon: "WalletCards", tone: "green", accentColor: "#218554", accentSoft: "var(--pastel-mint)" },
  messaging: { icon: "MessageCircle", tone: "blue", accentColor: "#386fc7", accentSoft: "var(--pastel-blue)" },
  operations: { icon: "CheckSquare", tone: "red", accentColor: "#ae3d49", accentSoft: "var(--pastel-rose)" },
  system: { icon: "Settings", tone: "slate", accentColor: "#5f6070", accentSoft: "var(--pastel-neutral)" }
};
