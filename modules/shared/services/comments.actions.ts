"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAuthContext(supabase: any) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { isAuthenticated: false };

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) return { isAuthenticated: false };

  return {
    isAuthenticated: true,
    userId: userData.user.id,
    organizationId: membership.organization_id,
  };
}

export type EntityType = "PO" | "GRN";

export async function getComments(entityType: EntityType, entityId: string) {
  const supabase = await createClient();
  const auth = await getAuthContext(supabase);

  if (!auth.isAuthenticated || !auth.organizationId) {
    return [];
  }

  const entityColumn = entityType === "PO" ? "purchase_order_id" : "goods_receipt_id";

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .eq(entityColumn, entityId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching comments:", error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Fetch profiles for the users who created these comments
  const userIds = [...new Set(data.map((c: any) => c.created_by))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .in("id", userIds);

  const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
    acc[p.id] = p;
    return acc;
  }, {});

  // Map to a more friendly format
  return data.map((comment: any) => {
    const profile = profilesMap[comment.created_by];
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      user: {
        id: comment.created_by,
        email: "", // Not available in profiles by default
        name: profile?.full_name || "Unknown User",
      }
    };
  });
}

export async function addComment(entityType: EntityType, entityId: string, content: string) {
  const supabase = await createClient();
  const auth = await getAuthContext(supabase);

  if (!auth.isAuthenticated || !auth.organizationId || !auth.userId) {
    return { error: "Unauthorized" };
  }

  const entityColumn = entityType === "PO" ? "purchase_order_id" : "goods_receipt_id";

  const { error } = await supabase
    .from("comments")
    .insert({
      organization_id: auth.organizationId,
      created_by: auth.userId,
      content: content,
      [entityColumn]: entityId,
    });

  if (error) {
    console.error("Error adding comment:", error);
    return { error: error.message };
  }

  // Revalidate paths so the UI updates
  if (entityType === "PO") {
    revalidatePath(`/purchase-orders/${entityId}`);
  } else if (entityType === "GRN") {
    revalidatePath(`/goods-receipts/${entityId}`);
  }

  return { success: true };
}
