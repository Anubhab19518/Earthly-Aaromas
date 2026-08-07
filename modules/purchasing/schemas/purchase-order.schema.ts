import { z } from "zod";

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  locationId: z.string().min(1, "Destination warehouse is required"),
  expectedDeliveryDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const purchaseOrderItemSchema = z.object({
  ingredientId: z.string().min(1, "Ingredient is required"),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unitId: z.string().min(1, "Unit is required"),
  expectedCost: z.number().min(0, "Cost must be zero or positive"),
  taxCategoryId: z.string().nullable().optional(),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;
export type PurchaseOrderItemFormValues = z.infer<typeof purchaseOrderItemSchema>;
