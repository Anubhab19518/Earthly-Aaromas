import { z } from "zod";

export const stockTransferSchema = z.object({
  sourceLocationId: z.string().min(1, "Source location is required"),
  destinationLocationId: z.string().min(1, "Destination location is required"),
  notes: z.string().nullable().optional(),
});

export const stockTransferItemSchema = z.object({
  ingredientId: z.string().min(1, "Ingredient is required"),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unitId: z.string().min(1, "Unit is required"),
});

export type StockTransferFormValues = z.infer<typeof stockTransferSchema>;
export type StockTransferItemFormValues = z.infer<typeof stockTransferItemSchema>;
