import { z } from "zod";

export const posCartItemSchema = z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  unit_price: z.number().min(0),
  tax_amount: z.number().min(0),
  line_total: z.number().min(0),
});

export const posPaymentSchema = z.object({
  method: z.enum(["Cash", "UPI", "Card"]),
  amount: z.number().positive(),
  reference: z.string().optional().nullable(),
});

export const processSaleSchema = z.object({
  location_id: z.string().uuid(),
  items: z.array(posCartItemSchema).min(1, "Cart cannot be empty"),
  payments: z.array(posPaymentSchema).min(1, "At least one payment method is required"),
  subtotal: z.number().min(0),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0),
  grand_total: z.number().min(0),
});

// New order-queue workflow schema
export const createOrderSchema = z.object({
  location_id: z.string().uuid(),
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().optional().nullable(),
  items: z.array(posCartItemSchema).min(1, "Cart cannot be empty"),
  subtotal: z.number().min(0),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0),
  grand_total: z.number().min(0),
});

export type POSCartItem = z.infer<typeof posCartItemSchema>;
export type POSPayment = z.infer<typeof posPaymentSchema>;
export type ProcessSalePayload = z.infer<typeof processSaleSchema>;
export type CreateOrderPayload = z.infer<typeof createOrderSchema>;
