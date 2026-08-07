import { z } from "zod";

export const menuCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").nullable().optional(),
  is_active: z.boolean().default(true),
});

export const menuItemSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").nullable().optional(),
  image_url: z.string().url("Must be a valid URL").nullable().optional().or(z.literal("")),
  tax_category_id: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const menuVariantSchema = z.object({
  menu_item_id: z.string().min(1, "Menu item is required"),
  name: z.string().min(1, "Variant name is required").max(100, "Name is too long"),
  default_price: z.number().min(0, "Price cannot be negative"),
  sku: z.string().max(50, "SKU is too long").nullable().optional().or(z.literal("")),
  serving_size: z.string().max(50, "Serving size is too long").nullable().optional().or(z.literal("")),
  prep_time_mins: z.number().min(0, "Preparation time cannot be negative").nullable().optional(),
  is_active: z.boolean().default(true),
});

export const recipeItemSchema = z.object({
  variant_id: z.string().min(1, "Variant is required"),
  ingredient_id: z.string().min(1, "Ingredient is required"),
  quantity_in_base_unit: z.number().positive("Quantity must be greater than zero"),
});

export const branchMenuConfigSchema = z.object({
  location_id: z.string().min(1, "Location is required"),
  variant_id: z.string().min(1, "Variant is required"),
  is_available: z.boolean().default(true),
  price_override: z.number().min(0, "Price override cannot be negative").nullable().optional(),
});

export type MenuCategoryFormValues = z.infer<typeof menuCategorySchema>;
export type MenuItemFormValues = z.infer<typeof menuItemSchema>;
export type MenuVariantFormValues = z.infer<typeof menuVariantSchema>;
export type RecipeItemFormValues = z.infer<typeof recipeItemSchema>;
export type BranchMenuConfigFormValues = z.infer<typeof branchMenuConfigSchema>;
