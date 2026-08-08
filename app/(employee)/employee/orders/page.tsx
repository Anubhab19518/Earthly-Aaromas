import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { OrderQueue } from "@/modules/pos/components/order-queue";

export default async function EmployeeOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/employee-login");

  const { data: rawInfo, error } = await supabase.rpc("get_my_employee_info").single();
  const info = rawInfo as any;

  if (error || !info || info.role_code === "OWNER") redirect("/dashboard");

  const locationId = info.location_id;
  if (!locationId) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">No Branch Assigned</h2>
        <p>You have not been assigned to a branch location. Please contact your administrator.</p>
      </div>
    );
  }

  const { data: orders, error: ordersError } = await supabase.rpc("get_location_orders", {
    p_location_id: locationId,
  });

  if (ordersError) {
    console.error("Failed to load orders:", ordersError);
  }

  const typedOrders = (orders || []).map((o: any) => ({
    order_id: o.order_id,
    order_number: o.order_number,
    order_status: o.order_status as "CONFIRMED" | "PREPARING" | "READY",
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    subtotal: Number(o.subtotal),
    tax_amount: Number(o.tax_amount),
    grand_total: Number(o.grand_total),
    created_at: o.created_at,
    updated_at: o.updated_at,
    items: Array.isArray(o.items) ? o.items : JSON.parse(o.items || "[]"),
  }));

  return (
    <div className="flex flex-col h-full">
      <OrderQueue initialOrders={typedOrders} locationId={locationId} />
    </div>
  );
}
