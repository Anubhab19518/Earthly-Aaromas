"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import {
  createTaxCategorySchema,
  updateTaxCategorySchema,
  deleteTaxCategorySchema,
  createTaxRateSchema,
  updateTaxRateSchema,
  deleteTaxRateSchema,
} from "@/modules/taxes/schemas/tax.schema";

export type TaxActionState = {
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

export async function createTaxCategory(
  _previousState: TaxActionState,
  formData: FormData,
): Promise<TaxActionState> {
  const parsedInput = createTaxCategorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    status: formData.get("status") || "ACTIVE",
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid category details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase.from("tax_categories").insert({
    organization_id: organizationId,
    name: parsedInput.data.name,
    description: parsedInput.data.description || null,
    status: parsedInput.data.status,
  });

  if (error) {
    if (error.code === "23505") {
      return { message: "A tax category with this name already exists." };
    }
    return { message: "We could not create the tax category. Please try again." };
  }

  revalidatePath("/taxes");
  return null;
}

export async function updateTaxCategory(
  _previousState: TaxActionState,
  formData: FormData,
): Promise<TaxActionState> {
  const parsedInput = updateTaxCategorySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || null,
    status: formData.get("status") || "ACTIVE",
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid category details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase
    .from("tax_categories")
    .update({
      name: parsedInput.data.name,
      description: parsedInput.data.description || null,
      status: parsedInput.data.status,
    })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "23505") {
      return { message: "A tax category with this name already exists." };
    }
    return { message: "We could not update the tax category. Please try again." };
  }

  revalidatePath("/taxes");
  return null;
}

export async function deleteTaxCategory(
  _previousState: TaxActionState,
  formData: FormData,
): Promise<TaxActionState> {
  const parsedInput = deleteTaxCategorySchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsedInput.success) return { message: "Invalid request." };

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase
    .from("tax_categories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) return { message: "We could not delete the tax category. Please try again." };

  revalidatePath("/taxes");
  return null;
}

export async function createTaxRate(
  _previousState: TaxActionState,
  formData: FormData,
): Promise<TaxActionState> {
  const parsedInput = createTaxRateSchema.safeParse({
    tax_category_id: formData.get("tax_category_id"),
    rate_percentage: Number(formData.get("rate_percentage")),
    effective_from: formData.get("effective_from"),
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid rate details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  // Note: the RLS policy on tax_rates uses a subquery to verify the category belongs to the org
  // and the user has permissions.
  const { error } = await supabase.from("tax_rates").insert({
    tax_category_id: parsedInput.data.tax_category_id,
    rate_percentage: parsedInput.data.rate_percentage,
    effective_from: parsedInput.data.effective_from,
  });

  if (error) {
    if (error.code === "23505") {
      return { message: "A tax rate with this effective date already exists for this category." };
    }
    if (error.code === "23514") {
      return { message: error.message || "Constraint violation." };
    }
    return { message: "We could not create the tax rate. Please try again." };
  }

  revalidatePath("/taxes");
  return null;
}

export async function updateTaxRate(
  _previousState: TaxActionState,
  formData: FormData,
): Promise<TaxActionState> {
  const parsedInput = updateTaxRateSchema.safeParse({
    id: formData.get("id"),
    tax_category_id: formData.get("tax_category_id"),
    rate_percentage: Number(formData.get("rate_percentage")),
    effective_from: formData.get("effective_from"),
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid rate details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase
    .from("tax_rates")
    .update({
      rate_percentage: parsedInput.data.rate_percentage,
      effective_from: parsedInput.data.effective_from,
    })
    .eq("id", parsedInput.data.id)
    .eq("tax_category_id", parsedInput.data.tax_category_id);

  if (error) {
    if (error.code === "23505") {
      return { message: "A tax rate with this effective date already exists for this category." };
    }
    return { message: "We could not update the tax rate. Please try again." };
  }

  revalidatePath("/taxes");
  return null;
}

export async function deleteTaxRate(
  _previousState: TaxActionState,
  formData: FormData,
): Promise<TaxActionState> {
  const parsedInput = deleteTaxRateSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsedInput.success) return { message: "Invalid request." };

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase
    .from("tax_rates")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsedInput.data.id)
    .is("deleted_at", null);

  if (error) return { message: "We could not delete the tax rate. Please try again." };

  revalidatePath("/taxes");
  return null;
}
