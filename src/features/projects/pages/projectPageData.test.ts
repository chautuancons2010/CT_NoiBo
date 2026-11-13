import { beforeEach, expect, it, vi } from "vitest";
import { AppError } from "@/lib/api/errors";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
const mocks = vi.hoisted(() => ({ getProject: vi.fn(), redirect: vi.fn(() => { throw new Error("REDIRECT"); }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("../services/projectRepository", () => ({ getProject: mocks.getProject }));
import { getProjectPageData } from "./projectPageData";
const user = { id: "admin" } as AuthenticatedUser;
beforeEach(() => vi.clearAllMocks());
it("returns a deleted or inaccessible package link to the list instead of a runtime error", async () => {
  mocks.getProject.mockRejectedValue(new AppError("NOT_FOUND"));
  await expect(getProjectPageData("deleted", user)).rejects.toThrow("REDIRECT");
  expect(mocks.redirect).toHaveBeenCalledWith("/projects");
});
it("preserves genuine server errors instead of pretending the package was deleted", async () => {
  const error = new AppError("SERVER_ERROR");mocks.getProject.mockRejectedValue(error);
  await expect(getProjectPageData("exists", user)).rejects.toBe(error);expect(mocks.redirect).not.toHaveBeenCalled();
});
