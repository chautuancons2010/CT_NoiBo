import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PayslipConsole } from "./PayslipConsole";

vi.mock("@/lib/ui/useMobileViewport", () => ({ useMobileViewport: () => true }));

afterEach(() => vi.unstubAllGlobals());

describe("mobile payslip scope", () => {
  it("requests only the signed-in employee's payslips even for a payroll manager", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<PayslipConsole canRevoke selfOnly={false} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/accounting/payslips?scope=self", { cache: "no-store" }));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/v1/accounting/payslips", expect.anything());
  });
});
