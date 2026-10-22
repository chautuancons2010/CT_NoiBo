import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PayslipDetail } from "./PayslipDetail";

vi.mock("@/lib/ui/useMobileViewport", () => ({ useMobileViewport: () => true }));

afterEach(() => vi.unstubAllGlobals());

describe("mobile payslip detail scope", () => {
  it("checks employee ownership when opening a direct payslip URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: "Không tìm thấy phiếu lương." } }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<PayslipDetail id="someone-elses-slip" selfOnly={false} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/accounting/payslips/someone-elses-slip?scope=self", { cache: "no-store" }));
  });
});
