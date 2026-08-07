"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import {
  createLocationSchema,
  updateLocationSchema,
  deleteLocationSchema,
} from "@/modules/locations/schemas/location.schema";

export type LocationActionState = {
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

export async function createLocation(
  _previousState: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const parsedInput = createLocationSchema.safeParse({
    parent_id: formData.get("parent_id") || null,
    location_type_id: formData.get("location_type_id"),
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address") || null,
    phone: formData.get("phone") || null,
    email: formData.get("email") || null,
    status: formData.get("status") || "ACTIVE",
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid location details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) {
    return { message: "Unauthorized or missing permission." };
  }

  const { error } = await supabase.from("locations").insert({
    organization_id: organizationId,
    parent_id: parsedInput.data.parent_id,
    location_type_id: parsedInput.data.location_type_id,
    name: parsedInput.data.name,
    code: parsedInput.data.code,
    address: parsedInput.data.address,
    phone: parsedInput.data.phone,
    email: parsedInput.data.email,
    status: parsedInput.data.status,
  });

  if (error) {
    if (error.code === "23505") {
      return { message: "A location with this code already exists." };
    }
    if (error.code === "23514") {
      return { message: error.message || "Parent location rules violated." };
    }
    return { message: "We could not create the location. Please try again." };
  }

  revalidatePath("/locations");
  return null;
}

export async function updateLocation(
  _previousState: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const parsedInput = updateLocationSchema.safeParse({
    id: formData.get("id"),
    parent_id: formData.get("parent_id") || null,
    location_type_id: formData.get("location_type_id"),
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address") || null,
    phone: formData.get("phone") || null,
    email: formData.get("email") || null,
    status: formData.get("status") || "ACTIVE",
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid location details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) {
    return { message: "Unauthorized or missing permission." };
  }

  const { error } = await supabase
    .from("locations")
    .update({
      parent_id: parsedInput.data.parent_id,
      location_type_id: parsedInput.data.location_type_id,
      name: parsedInput.data.name,
      code: parsedInput.data.code,
      address: parsedInput.data.address,
      phone: parsedInput.data.phone,
      email: parsedInput.data.email,
      status: parsedInput.data.status,
    })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "23505") {
      return { message: "A location with this code already exists." };
    }
    if (error.code === "23514") {
      return { message: error.message || "Parent location rules violated." };
    }
    return { message: "We could not update the location. Please try again." };
  }

  revalidatePath("/locations");
  return null;
}

export async function deleteLocation(
  _previousState: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const parsedInput = deleteLocationSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsedInput.success) {
    return { message: "Invalid request." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) {
    return { message: "Unauthorized or missing permission." };
  }

  const { error } = await supabase
    .from("locations")
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) {
    return { message: "We could not delete the location. Please try again." };
  }

  revalidatePath("/locations");
  return null;
}
