import { z } from "zod";

export const ingredientCategorySchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string().min(2, "Name must be at least 2 characters").max(80, "Name must be less than 80 characters"),
  description: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type IngredientCategory = z.infer<typeof ingredientCategorySchema>;

export const createIngredientCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80, "Name must be less than 80 characters"),
  description: z.string().nullable().optional(),
});

export type CreateIngredientCategoryFormValues = z.infer<typeof createIngredientCategorySchema>;

export const updateIngredientCategorySchema = createIngredientCategorySchema.and(
  z.object({
    id: z.string().uuid(),
  })
);

export type UpdateIngredientCategoryFormValues = z.infer<typeof updateIngredientCategorySchema>;

export const deleteIngredientCategorySchema = z.object({
  id: z.string().uuid(),
});

export const ingredientSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string().min(2, "Name must be at least 2 characters").max(160, "Name must be less than 160 characters"),
  sku: z.string().regex(/^[A-Z0-9_-]+$/, "SKU must contain only uppercase letters, numbers, underscores, or hyphens"),
  category_id: z.string().uuid({ message: "Please select a category" }),
  base_unit_id: z.string().uuid({ message: "Please select a base unit" }),
  default_purchase_unit_id: z.string().uuid().nullable().optional(),
  min_stock: z.number().nonnegative("Minimum stock cannot be negative").nullable().optional(),
  max_stock: z.number().nonnegative("Maximum stock cannot be negative").nullable().optional(),
  standard_cost: z.number().nonnegative("Standard cost cannot be negative").nullable().optional(),
  is_perishable: z.boolean(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type Ingredient = z.infer<typeof ingredientSchema>;

export const createIngredientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(160, "Name must be less than 160 characters"),
  sku: z.string().regex(/^[A-Z0-9_-]+$/, "SKU must contain only uppercase letters, numbers, underscores, or hyphens"),
  category_id: z.string().uuid({ message: "Please select a category" }),
  base_unit_id: z.string().uuid({ message: "Please select a base unit" }),
  default_purchase_unit_id: z.string().uuid().nullable().optional(),
  min_stock: z.number().nonnegative("Minimum stock cannot be negative").nullable().optional(),
  max_stock: z.number().nonnegative("Maximum stock cannot be negative").nullable().optional(),
  standard_cost: z.number().nonnegative("Standard cost cannot be negative").nullable().optional(),
  is_perishable: z.boolean(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CreateIngredientFormValues = z.infer<typeof createIngredientSchema>;

export const updateIngredientSchema = createIngredientSchema.and(
  z.object({
    id: z.string().uuid(),
  })
);

export type UpdateIngredientFormValues = z.infer<typeof updateIngredientSchema>;

export const deleteIngredientSchema = z.object({
  id: z.string().uuid(),
});
