"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/shared/lib/supabase/server";

const assignEmployeeSchema = z.object({
  email: z.email("Enter a valid employee email address.").trim().toLowerCase(),
  organizationId: z.uuid(),
});

export type AssignEmployeeState = { message: string; success: boolean } | null;

export async function assignEmployee(_previousState: AssignEmployeeState, formData: FormData): Promise<AssignEmployeeState> {
  const parsedInput = assignEmployeeSchema.safeParse({ email: formData.get("email"), organizationId: formData.get("organizationId") });
  if (!parsedInput.success) return { message: parsedInput.error.issues[0]?.message ?? "Invalid employee details.", success: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_employee_by_email", { employee_email: parsedInput.data.email, target_organization_id: parsedInput.data.organizationId });
  if (error) return { message: "The employee could not be assigned. Confirm their Supabase account exists and has a verified email.", success: false };
  revalidatePath("/team");
  return { message: "Employee access was assigned.", success: true };
}
