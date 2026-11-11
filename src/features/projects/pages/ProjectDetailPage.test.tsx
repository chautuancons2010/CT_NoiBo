import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ permissions: ["project.view", "worker_attendance.view"], getProject: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (href: string) => { throw new Error(`redirect:${href}`); }, notFound: () => { throw new Error("not-found"); } }));
vi.mock("@/services/auth/getRequestUser", () => ({ getRequestUser: async () => ({ id: "actor", status: "active", permissions: state.permissions }) }));
vi.mock("@/features/projects/services/projectRepository", () => ({ getProject: state.getProject }));
vi.mock("@/features/projects/components/ProjectWorkerTimesheet", () => ({ ProjectWorkerTimesheet: ({ project }: { project: { name: string } }) => <section aria-label="Bảng công gói">{project.name}</section> }));
vi.mock("@/components/shared/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/shared/States", () => ({ PermissionDeniedState: () => <p>Không có quyền xem công</p> }));
import { ProjectDetailPage } from "./ProjectDetailPage";

beforeEach(() => { vi.clearAllMocks(); state.permissions = ["project.view", "worker_attendance.view"]; state.getProject.mockResolvedValue({ id: "package", name: "Gói A" }); });
describe("package attendance-only scope", () => {
  it("opens the attendance viewer without loading construction workspaces", async () => {
    render(await ProjectDetailPage({ projectId: "package", section: "attendance" }));
    expect(screen.getByRole("heading", { name: "Bảng công công nhân" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Bảng công gói" })).toHaveTextContent("Gói A");
  });
  it("redirects former package sections to the attendance viewer", async () => {
    for (const section of ["today", "progress", "team", "materials", "profile", "documents"]) await expect(ProjectDetailPage({ projectId: "package", section })).rejects.toThrow("redirect:/projects/package/attendance");
    expect(state.getProject).not.toHaveBeenCalled();
  });
  it("does not grant attendance access from project access alone", async () => {
    state.permissions = ["project.view"];
    render(await ProjectDetailPage({ projectId: "package", section: "attendance" }));
    expect(screen.getByText("Không có quyền xem công")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Bảng công gói" })).not.toBeInTheDocument();
  });
  it("rejects unknown sections", async () => {
    await expect(ProjectDetailPage({ projectId: "package", section: "unknown" })).rejects.toThrow("not-found");
  });
});
