"use server";

import { redirect } from "next/navigation";

import { organizationBootstrapSchema } from "@/modules/auth/schemas/organization.schema";
import { createClient } from "@/shared/lib/supabase/server";

export type OrganizationBootstrapState = {
  message: string;
} | null;

export async function bootstrapOrganization(
  _previousState: OrganizationBootstrapState,
  formData: FormData,
): Promise<OrganizationBootstrapState> {
  const parsedInput = organizationBootstrapSchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName") || undefined,
    gstin: formData.get("gstin") || undefined,
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid organization details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("bootstrap_organization", {
    organization_gstin: parsedInput.data.gstin ?? null,
    organization_legal_name: parsedInput.data.legalName ?? null,
    organization_name: parsedInput.data.name,
  });

  if (error) {
    return { message: "We could not create the organization. Please try again." };
  }

  redirect("/dashboard");
}
