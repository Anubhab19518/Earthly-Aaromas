import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Utensils, Tag } from "lucide-react";
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
    <section className="space-y-4 font-sans text-xs">
      {/* Jira-Style Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link href="/menu" className="hover:text-blue-600 hover:underline flex items-center gap-1.5">
          <Utensils className="h-3.5 w-3.5 text-blue-600" />
          <span>Menu Catalog</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-900 font-semibold">{item.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-md border border-slate-200 p-4 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">{item.name}</h1>
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
              <Tag className="h-3 w-3 text-blue-600" />
              <span>{item.menu_categories?.name || "Uncategorized"}</span>
            </span>
          </div>
          {item.description && (
            <p className="text-xs text-slate-500 max-w-xl">{item.description}</p>
          )}
        </div>

        <Link
          href="/menu"
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Catalog</span>
        </Link>
      </div>

      <VariantsTable menuItemId={id} variants={variants || []} />
    </section>
  );
}
