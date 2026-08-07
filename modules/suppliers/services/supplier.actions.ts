"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import {
  createSupplierSchema,
  updateSupplierSchema,
  deleteSupplierSchema,
} from "@/modules/suppliers/schemas/supplier.schema";

export type SupplierActionState = {
  message: string;
} | null;

async function getActiveOrganizationId(supabase: any) {
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: canManage } = await supabase.rpc("has_permission", {
    required_permission_code: "master_data.manage",
    target_organization_id: membership.organization_id,
  });

  return canManage ? membership.organization_id : null;
}

export async function createSupplier(
  _previousState: SupplierActionState,
  formData: FormData,
): Promise<SupplierActionState> {
  const parsedInput = createSupplierSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || null,
    email: formData.get("email") || null,
    gstin: formData.get("gstin") || null,
    address: formData.get("address") || null,
    notes: formData.get("notes") || null,
    status: formData.get("status") || "ACTIVE",
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid supplier details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase.from("suppliers").insert({
    organization_id: organizationId,
    name: parsedInput.data.name,
    phone: parsedInput.data.phone || null,
    email: parsedInput.data.email || null,
    gstin: parsedInput.data.gstin ? parsedInput.data.gstin.toUpperCase() : null,
    address: parsedInput.data.address || null,
    notes: parsedInput.data.notes || null,
    status: parsedInput.data.status,
  });

  if (error) {
    if (error.code === "23505") {
      return { message: "A supplier with this GSTIN already exists." };
    }
    if (error.code === "23514") {
      return { message: error.message || "Constraint violation." };
    }
    return { message: "We could not create the supplier. Please try again." };
  }

  revalidatePath("/suppliers");
  return null;
}

export async function updateSupplier(
  _previousState: SupplierActionState,
  formData: FormData,
): Promise<SupplierActionState> {
  const parsedInput = updateSupplierSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    phone: formData.get("phone") || null,
    email: formData.get("email") || null,
    gstin: formData.get("gstin") || null,
    address: formData.get("address") || null,
    notes: formData.get("notes") || null,
    status: formData.get("status") || "ACTIVE",
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid supplier details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase
    .from("suppliers")
    .update({
      name: parsedInput.data.name,
      phone: parsedInput.data.phone || null,
      email: parsedInput.data.email || null,
      gstin: parsedInput.data.gstin ? parsedInput.data.gstin.toUpperCase() : null,
      address: parsedInput.data.address || null,
      notes: parsedInput.data.notes || null,
      status: parsedInput.data.status,
    })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "23505") {
      return { message: "A supplier with this GSTIN already exists." };
    }
    if (error.code === "23514") {
      return { message: error.message || "Constraint violation." };
    }
    return { message: "We could not update the supplier. Please try again." };
  }

  revalidatePath("/suppliers");
  return null;
}

export async function deleteSupplier(
  _previousState: SupplierActionState,
  formData: FormData,
): Promise<SupplierActionState> {
  const parsedInput = deleteSupplierSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsedInput.success) {
    return { message: "Invalid request." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase
    .from("suppliers")
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) {
    return { message: "We could not delete the supplier. Please try again." };
  }

  revalidatePath("/suppliers");
  return null;
}
