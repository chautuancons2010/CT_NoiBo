import { z } from "zod";

export const insuranceInputSchema = z.object({
  employeeId: z.string().uuid(),
  socialInsuranceNumber: z.string().trim().min(5).max(30),
  participationStatus: z.enum(["active", "suspended", "ended", "not_participating"]),
  startDate: z.string().date().optional(),
  contributionBase: z.number().min(0).max(1_000_000_000_000).optional(),
  socialInsuranceEnabled: z.boolean(),
  healthInsuranceEnabled: z.boolean(),
  unemploymentInsuranceEnabled: z.boolean(),
  changeType: z.enum(["joined", "adjusted", "suspended", "resumed", "ended"]),
  effectiveDate: z.string().date(),
  reason: z.string().trim().min(3).max(500)
});
