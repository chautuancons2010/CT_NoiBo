import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("uses POST as the native fallback so credentials never enter the URL", () => {
    render(<LoginForm />);

    expect(screen.getByRole("button", { name: "Đăng nhập" }).closest("form")).toHaveAttribute("method", "post");
  });
});
