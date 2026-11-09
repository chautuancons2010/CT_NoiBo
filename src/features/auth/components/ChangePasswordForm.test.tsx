import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "./ChangePasswordForm";

const { replace, refresh, push, clearAuth } = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn(), clearAuth: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh, push }) }));
vi.mock("@/lib/supabase/client", () => ({ clearSupabaseRealtimeAuthentication: clearAuth }));
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

function fill(confirmation = "NewPassword!123") {
  fireEvent.change(screen.getByLabelText("Mật khẩu hiện tại", { exact: false }), { target: { value: "OldPassword!123" } });
  fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/), { target: { value: "NewPassword!123" } });
  fireEvent.change(screen.getByLabelText(/^Nhập lại mật khẩu mới/), { target: { value: confirmation } });
}

describe("ChangePasswordForm", () => {
  it("catches a mismatched confirmation before sending credentials", () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    render(<ChangePasswordForm initiallyOpen />);
    fill("Mismatch!123");
    fireEvent.submit(screen.getByRole("form", { name: "Đổi mật khẩu" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Mật khẩu nhập lại chưa khớp.");
    expect(screen.getByLabelText(/^Nhập lại mật khẩu mới/)).toHaveFocus();
    expect(request).not.toHaveBeenCalled();
  });

  it("preserves values and allows retry after a connection failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<ChangePasswordForm initiallyOpen />);
    fill();
    fireEvent.submit(screen.getByRole("form"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Mất kết nối");
    expect(screen.getByRole("button", { name: "Lưu mật khẩu" })).toBeEnabled();
    expect(screen.getByLabelText(/^Mật khẩu mới/)).toHaveValue("NewPassword!123");
    expect(replace).not.toHaveBeenCalled();
  });

  it("submits once and clears realtime authentication after a successful change", async () => {
    let finish!: (response: Response) => void;
    const request = vi.fn<typeof fetch>(() => new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", request);
    render(<ChangePasswordForm initiallyOpen />);
    fill();
    const form = screen.getByRole("form");
    expect(form).toHaveAttribute("method", "post");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(request).toHaveBeenCalledOnce();
    expect(JSON.parse(request.mock.calls[0]?.[1]?.body as string)).toEqual({ currentPassword: "OldPassword!123", newPassword: "NewPassword!123" });
    finish(new Response(JSON.stringify({ ok: true })));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(clearAuth).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
