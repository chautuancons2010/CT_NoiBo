import { z } from "zod";
import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/api/errors";
import { parseWithSchema } from "@/lib/api/validation";

describe("api validation", () => {
  it("returns parsed data when schema is valid", () => {
    const schema = z.object({ key: z.string().min(1) });

    expect(parseWithSchema(schema, { key: "attendance.shift.default" })).toEqual({
      key: "attendance.shift.default"
    });
  });

  it("throws a validation app error for invalid input", () => {
    const schema = z.object({ key: z.string().min(1) });

    expect(() => parseWithSchema(schema, { key: "" })).toThrow(AppError);
  });
});
