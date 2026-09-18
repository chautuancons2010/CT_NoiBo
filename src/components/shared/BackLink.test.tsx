import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BackLink } from "@/components/shared/BackLink";

describe("BackLink", () => {
  it("uses the supplied safe parent route", () => {
    render(<BackLink href="/fixed-fallback" />);
    expect(screen.getByRole("link", { name: "Trở lại" })).toHaveAttribute("href", "/fixed-fallback");
  });
});
