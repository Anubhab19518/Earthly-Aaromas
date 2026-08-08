"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import { createOrderSchema, CreateOrderPayload } from "../schemas/pos.schema";

export type OrderActionState = { message: string } | null;

// ─── Create Order (CONFIRMED) ────────────────────────────────────────────────

export async function createOrderAction(
  payload: CreateOrderPayload
): Promise<{ success: boolean; message: string; orderId?: string }> {
  const parsed = createOrderSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid order details." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return { success: false, message: "Unauthorized." };
  }

  const { data: orderId, error } = await supabase.rpc("create_order", {
    p_location_id: parsed.data.location_id,
    p_customer_name: parsed.data.customer_name,
    p_customer_phone: parsed.data.customer_phone ?? null,
    p_items: parsed.data.items.map(({ cart_id: _c, name: _n, variantName: _v, taxRate: _t, ...rest }: any) => rest),
    p_subtotal: parsed.data.subtotal,
    p_discount: parsed.data.discount_amount,
    p_tax: parsed.data.tax_amount,
    p_grand_total: parsed.data.grand_total,
  });

  if (error) {
    // Surface meaningful validation errors to the employee
    if (error.message.includes("Price mismatch") || error.message.includes("not active") ||
        error.message.includes("not available") || error.message.includes("Customer name")) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Failed to place order. Please try again." };
  }

  revalidatePath("/employee/orders");
  revalidatePath("/employee/pos");
  return { success: true, message: "Order placed successfully.", orderId: orderId as string };
}

// ─── Start Preparing (CONFIRMED → PREPARING, deducts inventory) ──────────────

export async function startPreparingAction(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  if (!orderId) return { success: false, message: "Invalid order." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, message: "Unauthorized." };

  const { error } = await supabase.rpc("start_preparing_order", { p_order_id: orderId });

  if (error) {
    if (error.message.includes("Insufficient stock")) {
      return { success: false, message: error.message };
    }
    if (error.message.includes("not in CONFIRMED")) {
      return { success: false, message: "This order has already been started or is not ready." };
    }
    if (error.message.includes("not assigned")) {
      return { success: false, message: "You are not assigned to this branch." };
    }
    return { success: false, message: "Could not start preparation. Please try again." };
  }

  revalidatePath("/employee/orders");
  return { success: true, message: "Order is now being prepared." };
}

// ─── Mark Order Ready (PREPARING → READY) ───────────────────────────────────

export async function markOrderReadyAction(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  if (!orderId) return { success: false, message: "Invalid order." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, message: "Unauthorized." };

  const { error } = await supabase.rpc("mark_order_ready", { p_order_id: orderId });
  if (error) return { success: false, message: error.message ?? "Could not mark order as ready." };

  revalidatePath("/employee/orders");
  return { success: true, message: "Order is ready for collection." };
}

// ─── Complete Order (READY → COMPLETED) ──────────────────────────────────────

export async function completeOrderAction(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  if (!orderId) return { success: false, message: "Invalid order." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, message: "Unauthorized." };

  const { error } = await supabase.rpc("complete_order", { p_order_id: orderId });
  if (error) return { success: false, message: error.message ?? "Could not complete order." };

  revalidatePath("/employee/orders");
  return { success: true, message: "Order completed." };
}

// ─── Cancel Order (CONFIRMED → CANCELLED only) ───────────────────────────────

export async function cancelOrderAction(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  if (!orderId) return { success: false, message: "Invalid order." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, message: "Unauthorized." };

  const { error } = await supabase.rpc("cancel_order", { p_order_id: orderId });
  if (error) return { success: false, message: error.message ?? "Could not cancel order." };

  revalidatePath("/employee/orders");
  return { success: true, message: "Order cancelled." };
}
