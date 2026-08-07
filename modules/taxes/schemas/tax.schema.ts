import { z } from "zod";

export const taxCategorySchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  description: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type TaxCategory = z.infer<typeof taxCategorySchema>;

export const taxRateSchema = z.object({
  id: z.string().uuid(),
  tax_category_id: z.string().uuid(),
  rate_percentage: z.number().min(0).max(100),
  effective_from: z.string(), // ISO date string (YYYY-MM-DD)
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type TaxRate = z.infer<typeof taxRateSchema>;

// Form schemas for Tax Categories
export const createTaxCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  description: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CreateTaxCategoryFormValues = z.infer<typeof createTaxCategorySchema>;

export const updateTaxCategorySchema = createTaxCategorySchema.and(
  z.object({
    id: z.string().uuid(),
  })
);

export type UpdateTaxCategoryFormValues = z.infer<typeof updateTaxCategorySchema>;

export const deleteTaxCategorySchema = z.object({
  id: z.string().uuid(),
});

// Form schemas for Tax Rates
export const createTaxRateSchema = z.object({
  tax_category_id: z.string().uuid(),
  rate_percentage: z.number().min(0, "Rate cannot be negative").max(100, "Rate cannot exceed 100%"),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
});

export type CreateTaxRateFormValues = z.infer<typeof createTaxRateSchema>;

export const updateTaxRateSchema = createTaxRateSchema.and(
  z.object({
    id: z.string().uuid(),
  })
);

export type UpdateTaxRateFormValues = z.infer<typeof updateTaxRateSchema>;

export const deleteTaxRateSchema = z.object({
  id: z.string().uuid(),
});
