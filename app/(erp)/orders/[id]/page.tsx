import { redirect, notFound } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { OwnerOrderDetailClient } from "@/modules/pos/components/owner-order-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OwnerOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  // Fetch the order
  const { data: order, error } = await supabase
    .from("sales_orders")
    .select("*, locations(name), users:created_by(id)")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .single();

  if (error || !order) {
    notFound();
  }

  // Fetch items
  const { data: items } = await supabase
    .from("sales_order_items")
    .select("*, menu_variants(name, sku)")
    .eq("sales_order_id", id)
    .order("created_at", { ascending: true });

  // Fetch payments
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("sales_order_id", id)
    .order("created_at", { ascending: true });

  // Fetch creator profile
  let creatorName = "Unknown";
  if (order.users?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", order.users.id)
      .single();
    if (profile) {
      creatorName = profile.full_name;
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <OwnerOrderDetailClient 
        order={{ ...order, creator_name: creatorName }} 
        items={items || []} 
        payments={payments || []} 
      />
    </div>
  );
}
