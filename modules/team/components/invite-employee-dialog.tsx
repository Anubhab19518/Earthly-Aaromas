"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInvitation } from "@/modules/team/services/invitation.actions";
import { createInvitationSchema, CreateInvitationFormValues } from "@/modules/team/schemas/invitation.schema";

interface InviteEmployeeDialogProps {
  roles: { id: string; name: string; code: string }[];
  locations: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteEmployeeDialog({ roles, locations, open, onOpenChange }: InviteEmployeeDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<string | null>(null);

  const form = useForm<CreateInvitationFormValues>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      email: "",
      role_id: "",
      location_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
      setErrorMsg(null);
      setSuccessLink(null);
    }
  }, [open, form]);

  const onSubmit = (data: CreateInvitationFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("role_id", data.role_id);
      if (data.location_id) formData.append("location_id", data.location_id);

      const result = await createInvitation(null, formData);

      if (result?.inviteLink) {
        setSuccessLink(result.inviteLink);
      } else if (result?.message) {
        setErrorMsg(result.message);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Invite Employee</h2>
        
        {successLink ? (
          <div className="mt-4">
            <div className="rounded-md bg-emerald-50 p-4 border border-emerald-200">
              <h3 className="text-sm font-medium text-emerald-800">Invitation Generated</h3>
              <p className="mt-2 text-sm text-emerald-700">
                In a real application, an email would be sent to the employee. For this demo, copy the secure invitation link below and open it in a new window to set the password.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={successLink}
                  className="w-full rounded-md border border-emerald-300 bg-white px-3 py-2 text-xs font-mono outline-none"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(successLink)}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Email Address *</label>
              <input
                type="email"
                {...form.register("email")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
                placeholder="employee@earthlyaaromas.com"
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Role *</label>
              <select
                {...form.register("role_id")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
              >
                <option value="">Select a role...</option>
                {roles.filter(r => r.code !== "OWNER").map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {form.formState.errors.role_id && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.role_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Assigned Branch (Optional)</label>
              <select
                {...form.register("location_id")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
              >
                <option value="">All Branches</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white hover:bg-[#587333] disabled:opacity-60"
              >
                {isPending ? "Generating Invite..." : "Send Invitation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

