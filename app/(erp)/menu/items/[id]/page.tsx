import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/shared/lib/supabase/server";
import { VariantsTable } from "@/modules/menu/components/variants-table";

export default async function MenuItemPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  const { data: canManage } = await supabase.rpc("has_permission", {
    required_permission_code: "master_data.manage",
    target_organization_id: membership.organization_id,
  });

  if (!canManage) redirect("/dashboard");

  const { data: item } = await supabase
    .from("menu_items")
    .select("*, menu_categories(name)")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .single();

  if (!item) redirect("/menu");

  const { data: variants } = await supabase
    .from("menu_variants")
    .select("*")
    .eq("menu_item_id", id)
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .order("name");

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{item.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Category: {item.menu_categories?.name}
          </p>
        </div>
      </div>

      <VariantsTable menuItemId={id} variants={variants || []} />
    </section>
  );
}
