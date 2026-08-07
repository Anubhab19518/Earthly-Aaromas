import { z } from "zod";

export const organizationBootstrapSchema = z.object({
  gstin: z.string().trim().max(15, "GSTIN cannot exceed 15 characters.").optional(),
  legalName: z.string().trim().max(160, "Legal name cannot exceed 160 characters.").optional(),
  name: z.string().trim().min(2, "Organization name must contain at least 2 characters.").max(160),
});
