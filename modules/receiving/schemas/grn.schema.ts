import { z } from "zod";

export const GrnStatusSchema = z.enum(["DRAFT", "POSTED", "CANCELLED"]);
export type GrnStatus = z.infer<typeof GrnStatusSchema>;

export const goodsReceiptSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  grn_number: z.string(),
  supplier_id: z.string().uuid(),
  warehouse_location_id: z.string().uuid(),
  invoice_number: z.string().nullable().optional(),
  invoice_date: z.string().nullable().optional(),
  purchase_order_id: z.string().uuid().nullable().optional(),
  received_date: z.string(),
  remarks: z.string().nullable().optional(),
  status: GrnStatusSchema,
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type GoodsReceipt = z.infer<typeof goodsReceiptSchema>;

export const goodsReceiptItemSchema = z.object({
  id: z.string().uuid(),
  goods_receipt_id: z.string().uuid(),
  ingredient_id: z.string().uuid(),
  purchase_unit_id: z.string().uuid(),
  received_quantity: z.number().positive(),
  converted_base_quantity: z.number().positive(),
  unit_cost: z.number().nonnegative(),
  tax_category_id: z.string().uuid().nullable().optional(),
  line_total: z.number().nonnegative(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type GoodsReceiptItem = z.infer<typeof goodsReceiptItemSchema>;

// ─── Form Schemas ────────────────────────────────────────────────────────────

export const createGrnSchema = z.object({
  supplier_id: z.string().uuid("Please select a supplier"),
  warehouse_location_id: z.string().uuid("Please select a warehouse"),
  purchase_order_id: z.string().uuid().nullable().optional(),
  invoice_number: z.string().max(80).nullable().optional(),
  invoice_date: z.string().nullable().optional(),
  received_date: z.string().min(1, "Received date is required"),
  remarks: z.string().max(500).nullable().optional(),
});

export type CreateGrnFormValues = z.infer<typeof createGrnSchema>;

export const updateGrnSchema = createGrnSchema.and(z.object({ id: z.string().uuid() }));
export type UpdateGrnFormValues = z.infer<typeof updateGrnSchema>;

export const addGrnItemSchema = z.object({
  goods_receipt_id: z.string().uuid(),
  ingredient_id: z.string().uuid("Please select an ingredient"),
  purchase_unit_id: z.string().uuid("Please select a purchase unit"),
  received_quantity: z.number().positive("Received quantity must be greater than 0"),
  unit_cost: z.number().nonnegative("Unit cost cannot be negative"),
  tax_category_id: z.string().uuid().nullable().optional(),
});

export type AddGrnItemFormValues = z.infer<typeof addGrnItemSchema>;

export const updateGrnItemSchema = addGrnItemSchema.and(z.object({ id: z.string().uuid() }));
export type UpdateGrnItemFormValues = z.infer<typeof updateGrnItemSchema>;
