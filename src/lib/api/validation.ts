import { z } from "zod";

import { AppError } from "@/lib/api/errors";

export function parseWithSchema<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  value: unknown
): z.infer<TSchema> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", undefined, result.error.flatten());
  }

  return result.data;
}
