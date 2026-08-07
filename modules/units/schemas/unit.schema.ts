import { z } from "zod";

export const unitSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(80, "Name must be less than 80 characters"),
  symbol: z.string().min(1, "Symbol is required").max(20, "Symbol must be less than 20 characters"),
  measurement_category: z.enum(["WEIGHT", "VOLUME", "COUNT", "COOKING"]),
  is_base_unit: z.boolean(),
  base_unit_id: z.string().uuid().nullable(),
  conversion_factor: z.coerce.number().positive().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type Unit = z.infer<typeof unitSchema>;

export const createUnitSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name must be less than 80 characters"),
  symbol: z.string().min(1, "Symbol is required").max(20, "Symbol must be less than 20 characters"),
  measurement_category: z.enum(["WEIGHT", "VOLUME", "COUNT", "COOKING"]),
  is_base_unit: z.boolean(),
  base_unit_id: z.string().uuid().or(z.literal("")).nullable().optional(),
  conversion_factor: (z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().positive("Conversion factor must be positive").nullable().optional()
  ) as z.ZodType<number | null | undefined>),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CreateUnitFormValues = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = createUnitSchema.and(
  z.object({
    id: z.string().uuid(),
  })
);

export type UpdateUnitFormValues = z.infer<typeof updateUnitSchema>;

export const deleteUnitSchema = z.object({
  id: z.string().uuid(),
});
