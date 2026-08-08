import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { POSTerminal } from "@/modules/pos/components/pos-terminal";

export default async function POSPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/employee-login");

  // Use the security-definer RPC — employees are at aal1, so direct table queries
  // on organization_memberships are blocked by RLS.
  const { data: rawInfo, error } = await supabase.rpc("get_my_employee_info").single();
  const info = rawInfo as any;

  if (error || !info) redirect("/employee-login");
  if (info.role_code === "OWNER") redirect("/dashboard");

  const organizationId = info.organization_id;
  const employeeLocationId = info.location_id;

  if (!employeeLocationId) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">No Branch Assigned</h2>
        <p>You have not been assigned to a branch location. Please contact your administrator.</p>
      </div>
    );
  }

  // Use the security-definer RPC to load menu data for POS
  const { data: posMenu } = await supabase.rpc("get_pos_menu", {
    p_organization_id: organizationId,
    p_location_id: employeeLocationId,
  });

  const menuData = posMenu || [];

  // Group data for the terminal
  const categoriesMap = new Map<string, { id: string; name: string }>();
  const itemsMap = new Map<string, { id: string; category_id: string; name: string; image_url: string | null; tax_rate: number }>();
  const variantsList: { id: string; menu_item_id: string; name: string; default_price: number }[] = [];
  const branchConfigsList: { variant_id: string; is_available: boolean; price_override: number | null }[] = [];

  for (const row of menuData) {
    if (!categoriesMap.has(row.category_id)) {
      categoriesMap.set(row.category_id, { id: row.category_id, name: row.category_name });
    }
    if (!itemsMap.has(row.item_id)) {
      itemsMap.set(row.item_id, {
        id: row.item_id,
        category_id: row.category_id,
        name: row.item_name,
        image_url: row.image_url,
        tax_rate: row.tax_rate || 0,
      });
    }
    variantsList.push({
      id: row.variant_id,
      menu_item_id: row.item_id,
      name: row.variant_name,
      default_price: row.effective_price,
    });
    branchConfigsList.push({
      variant_id: row.variant_id,
      is_available: true,
      price_override: row.price_override,
    });
  }

  const categories = Array.from(categoriesMap.values());
  const items = Array.from(itemsMap.values()).map(item => ({
    ...item,
    tax_category_id: null,
    tax_categories: { rate: item.tax_rate },
  }));

  return (
    <div className="flex flex-col h-full w-full">
      <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Point of Sale</h1>
      </div>
      
      <POSTerminal
        locationId={employeeLocationId}
        categories={categories}
        items={items}
        variants={variantsList}
        branchConfigs={branchConfigsList}
      />
    </div>
  );
}
