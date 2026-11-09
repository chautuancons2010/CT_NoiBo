import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentCenter } from "./DocumentCenter";
afterEach(() => vi.unstubAllGlobals());
describe("document workspace", () => {
  it("recovers a rejected read through the actual request", async () => {
    let failed = false;
    const fetchMock = vi.fn().mockImplementation(async url => {
      if (String(url).includes("document-types")) return { ok: true, json: async () => ({ data: [] }) };
      if (!failed) { failed = true; throw new Error("Mất kết nối"); }
      return { ok: true, json: async () => ({ data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock); render(<DocumentCenter />);
    fireEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
    await screen.findByText("Chưa có tài liệu");
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("documents?"))).toHaveLength(2);
  });
  it("retains title and file after a failed upload and prevents duplicate requests", async () => {
    let reject: ((reason: Error) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation((url, init) => {
      if (init?.method === "POST") return new Promise((_resolve, failure) => { reject = failure; });
      return Promise.resolve({ ok: true, json: async () => ({ data: String(url).includes("document-types") ? [{ id: "type", name: "Hồ sơ" }] : [] }) });
    });
    vi.stubGlobal("fetch", fetchMock); const { container } = render(<DocumentCenter />);
    const open = await screen.findByRole("button", { name: "Tải tài liệu nội bộ" }); await waitFor(() => expect(open).toBeEnabled()); fireEvent.click(open);
    fireEvent.change(screen.getByLabelText(/Tên tài liệu/), { target: { value: "Bản vẽ" } });
    const file = new File(["%PDF"], "ban-ve.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/Tệp tài liệu/), { target: { files: [file] } });
    const form = container.querySelector("form")!; fireEvent.submit(form); fireEvent.submit(form);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    reject?.(new Error("Không thể tải lên")); await screen.findByText("Không thể tải lên");
    expect(screen.getByLabelText(/Tên tài liệu/)).toHaveValue("Bản vẽ");
    expect(screen.getByText("ban-ve.pdf")).toBeInTheDocument();
  });
});
