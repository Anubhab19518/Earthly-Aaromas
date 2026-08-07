import { z } from "zod";

export const ingredientUnitConversionSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  ingredient_id: z.string().uuid(),
  from_unit_id: z.string().uuid(),
  to_unit_id: z.string().uuid(),
  conversion_factor: z.number().positive(),
  notes: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type IngredientUnitConversion = z.infer<typeof ingredientUnitConversionSchema>;

export const createConversionSchema = z.object({
  ingredient_id: z.string().uuid({ message: "Ingredient is required" }),
  from_unit_id: z.string().uuid({ message: "Please select a unit to convert from" }),
  to_unit_id: z.string().uuid({ message: "Please select the base unit" }),
  conversion_factor: z
    .number()
    .positive("Conversion factor must be greater than zero"),
  notes: z.string().max(255, "Notes must be less than 255 characters").nullable().optional(),
});

export type CreateConversionFormValues = z.infer<typeof createConversionSchema>;

export const updateConversionSchema = createConversionSchema.and(
  z.object({
    id: z.string().uuid(),
  })
);

export type UpdateConversionFormValues = z.infer<typeof updateConversionSchema>;

export const deleteConversionSchema = z.object({
  id: z.string().uuid(),
});
