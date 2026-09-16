import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Select } from "@/components/shared/FormControls";

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
});
