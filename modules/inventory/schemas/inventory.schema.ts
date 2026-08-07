import { z } from "zod";

export const TransactionTypeSchema = z.enum([
  "GOODS_RECEIPT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "SALE",
  "RECIPE_CONSUMPTION",
  "STOCK_ADJUSTMENT",
  "WASTAGE",
  "RETURN",
]);

export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export const inventoryLedgerSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  location_id: z.string().uuid(),
  ingredient_id: z.string().uuid(),
  transaction_type: TransactionTypeSchema,
  reference_type: z.string().nullable().optional(),
  reference_id: z.string().nullable().optional(),
  quantity_change: z.number(),
  unit_id: z.string().uuid(),
  running_cost: z.number().nullable().optional(),
  remarks: z.string().nullable().optional(),
  performed_by: z.string().uuid(),
  created_at: z.string().datetime(),
});

export type InventoryLedger = z.infer<typeof inventoryLedgerSchema>;

export const inventorySnapshotSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  location_id: z.string().uuid(),
  ingredient_id: z.string().uuid(),
  quantity_on_hand: z.number(),
  average_cost: z.number().nullable().optional(),
  last_movement_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type InventorySnapshot = z.infer<typeof inventorySnapshotSchema>;

export const postInventoryMovementSchema = z.object({
  location_id: z.string().uuid("Please select a location"),
  ingredient_id: z.string().uuid("Please select an ingredient"),
  transaction_type: TransactionTypeSchema,
  reference_type: z.string().nullable().optional(),
  reference_id: z.string().nullable().optional(),
  quantity_change: z.number(),
  unit_id: z.string().uuid(),
  running_cost: z.number().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

export type PostInventoryMovementInput = z.infer<typeof postInventoryMovementSchema>;

// For the Stock Adjustment Form specifically
export const stockAdjustmentFormSchema = z.object({
  location_id: z.string().uuid("Please select a location"),
  ingredient_id: z.string().uuid("Please select an ingredient"),
  reason: z.enum(["OPENING_STOCK", "ADJUSTMENT", "DAMAGE", "EXPIRY"]),
  quantity_change: z.number().refine((val) => val !== 0, "Quantity cannot be zero"),
  remarks: z.string().optional(),
});

export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentFormSchema>;
