import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PasswordInput, Select } from "@/components/shared/FormControls";

describe("FormControls", () => {
  it("keeps a compact select label accessible when it is visually hidden", () => {
    const { container } = render(
      <Select
        label="Phòng ban"
        labelHidden
        options={[{ label: "Nhân sự", value: "hr" }]}
        placeholder="Phòng ban: Tất cả"
      />
    );

    expect(screen.getByLabelText("Phòng ban")).toBeInTheDocument();
    expect(container.querySelector(".sr-only")).toHaveTextContent("Phòng ban");
  });

  it("toggles password visibility without submitting or clearing the value", () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(<form onSubmit={submit}><PasswordInput label="Mật khẩu" name="password" defaultValue="Secret123" /></form>);
    const input = screen.getByLabelText("Mật khẩu") as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Hiển thị mật khẩu" }));
    expect(input.type).toBe("text");
    expect(input.value).toBe("Secret123");
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ẩn mật khẩu" }));
    expect(input.type).toBe("password");
  });
});
