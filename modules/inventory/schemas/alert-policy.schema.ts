import { z } from "zod";

export const inventoryAlertPolicySchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  location_id: z.string().uuid(),
  ingredient_id: z.string().uuid(),
  warning_level: z.number().nonnegative(),
  critical_level: z.number().nonnegative(),
  out_of_stock_level: z.number().nonnegative(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type InventoryAlertPolicy = z.infer<typeof inventoryAlertPolicySchema>;

export const createAlertPolicySchema = z
  .object({
    location_id: z.string().uuid("Please select a location"),
    ingredient_id: z.string().uuid(),
    warning_level: z.number().nonnegative("Warning level cannot be negative"),
    critical_level: z.number().nonnegative("Critical level cannot be negative"),
    out_of_stock_level: z.number().nonnegative("Out of stock level cannot be negative"),
  })
  .refine((data) => data.warning_level > data.critical_level, {
    message: "Warning level must be greater than critical level",
    path: ["warning_level"],
  })
  .refine((data) => data.critical_level >= data.out_of_stock_level, {
    message: "Critical level must be greater than or equal to out of stock level",
    path: ["critical_level"],
  });

export type CreateAlertPolicyFormValues = z.infer<typeof createAlertPolicySchema>;

export const updateAlertPolicySchema = z
  .object({
    id: z.string().uuid(),
    warning_level: z.number().nonnegative("Warning level cannot be negative"),
    critical_level: z.number().nonnegative("Critical level cannot be negative"),
    out_of_stock_level: z.number().nonnegative("Out of stock level cannot be negative"),
  })
  .refine((data) => data.warning_level > data.critical_level, {
    message: "Warning level must be greater than critical level",
    path: ["warning_level"],
  })
  .refine((data) => data.critical_level >= data.out_of_stock_level, {
    message: "Critical level must be greater than or equal to out of stock level",
    path: ["critical_level"],
  });

export type UpdateAlertPolicyFormValues = z.infer<typeof updateAlertPolicySchema>;

export const deleteAlertPolicySchema = z.object({
  id: z.string().uuid(),
});
