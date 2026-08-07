"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import { processSaleSchema, ProcessSalePayload } from "../schemas/pos.schema";

export type POSActionState = { message: string } | null;

export async function processSaleAction(
  payload: ProcessSalePayload
): Promise<{ success: boolean; message: string; orderId?: string }> {
  const parsed = processSaleSchema.safeParse(payload);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid sale details." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return { success: false, message: "Unauthorized." };
  }

  // Calculate sum of payments vs grand total
  const totalPaid = parsed.data.payments.reduce((sum, p) => sum + p.amount, 0);
  if (Math.abs(totalPaid - parsed.data.grand_total) > 0.05) {
    return { success: false, message: "Payment amount does not match grand total." };
  }

  const { data: orderId, error } = await supabase.rpc("process_sale", {
    p_location_id: parsed.data.location_id,
    p_items: parsed.data.items,
    p_payments: parsed.data.payments,
    p_subtotal: parsed.data.subtotal,
    p_discount: parsed.data.discount_amount,
    p_tax: parsed.data.tax_amount,
    p_grand_total: parsed.data.grand_total,
  });

  if (error) {
    if (error.message.includes("Insufficient inventory")) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Failed to process sale. Please try again." };
  }

  revalidatePath("/employee/pos");
  return { success: true, message: "Sale processed successfully.", orderId };
}
