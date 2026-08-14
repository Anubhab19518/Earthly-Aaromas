"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInvitation } from "@/modules/team/services/invitation.actions";
import { createInvitationSchema, CreateInvitationFormValues } from "@/modules/team/schemas/invitation.schema";
import { UserPlus, X, Loader2, ChevronDown } from "lucide-react";

interface InviteEmployeeDialogProps {
  roles: { id: string; name: string; code: string }[];
  locations: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent?: (msg: string) => void;
}

export function InviteEmployeeDialog({ roles, locations, open, onOpenChange, onInviteSent }: InviteEmployeeDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<CreateInvitationFormValues>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      email: "",
      role_id: "",
      location_id: "",
    },
  });

  const availableRoles = roles.filter((r) => r.code !== "OWNER");
  const selectedRoleId = form.watch("role_id");

  useEffect(() => {
    if (open) {
      form.reset();
      setErrorMsg(null);
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

      if (result?.message === "Invitation created successfully.") {
        onInviteSent?.(`Invitation email sent to ${data.email}`);
        onOpenChange(false);
      } else if (result?.message) {
        setErrorMsg(result.message);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-md border border-slate-200/90 bg-white shadow-xl animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 border border-slate-200/70 text-slate-700">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Invite team member</h2>
              <p className="text-xs text-slate-500">Send an invitation to join your team.</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="Close dialog"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                  Email address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  {...form.register("email")}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-2xs"
                  placeholder="colleague@company.com"
                />
                {form.formState.errors.email && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                  Role <span className="text-rose-500">*</span>
                </label>
                
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                  {availableRoles.map((r) => {
                    const isSelected = selectedRoleId === r.id;
                    return (
                      <label
                        key={r.id}
                        onClick={() => form.setValue("role_id", r.id, { shouldValidate: true })}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-all ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/40 text-slate-900 ring-1 ring-indigo-600/20"
                            : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`h-2 w-2 rounded-full transition-colors ${isSelected ? "bg-indigo-600" : "bg-slate-300"}`} />
                          <span className="text-xs font-medium">{r.name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                          {r.code}
                        </span>
                        <input
                          type="radio"
                          value={r.id}
                          {...form.register("role_id")}
                          className="sr-only"
                        />
                      </label>
                    );
                  })}
                </div>

                {form.formState.errors.role_id && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">
                    {form.formState.errors.role_id.message}
                  </p>
                )}
              </div>

              {/* Location Assignment */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                  Branch location <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <select
                    {...form.register("location_id")}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-2xs pr-8 cursor-pointer"
                  >
                    <option value="">All Branches / Global access</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-rose-50 p-2.5 text-[11px] font-medium text-rose-600 border border-rose-200/80">
                  {errorMsg}
                </div>
              )}

              {/* Dialog Footer Actions */}
              <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-4 py-1.5 text-xs font-medium text-white transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating link...</span>
                    </>
                  ) : (
                    <span>Send invitation</span>
                  )}
                </button>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
}

