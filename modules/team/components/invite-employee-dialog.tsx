"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInvitation } from "@/modules/team/services/invitation.actions";
import { createInvitationSchema, CreateInvitationFormValues } from "@/modules/team/schemas/invitation.schema";
import { 
  UserPlus, 
  X, 
  Loader2, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Check, 
  Copy, 
  Sparkles,
  ShieldCheck,
  Building2,
  Mail,
  User
} from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    fullName: string;
    roleName: string;
    locationName?: string;
  } | null>(null);

  const form = useForm<CreateInvitationFormValues>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      phone: "",
      role_id: "",
      location_id: "",
    },
  });

  const availableRoles = roles.filter((r) => r.code !== "OWNER");
  const selectedRoleId = form.watch("role_id");

  useEffect(() => {
    if (open) {
      form.reset({
        fullName: "",
        email: "",
        password: generateRandomPassword(),
        phone: "",
        role_id: availableRoles[0]?.id || "",
        location_id: "",
      });
      setErrorMsg(null);
      setCreatedCredentials(null);
      setShowPassword(true);
    }
  }, [open]);

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pass = "Tea@";
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  const handleGeneratePassword = () => {
    const newPass = generateRandomPassword();
    form.setValue("password", newPass, { shouldValidate: true });
    setShowPassword(true);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const onSubmit = (data: CreateInvitationFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      
      const formData = new FormData();
      formData.append("fullName", data.fullName);
      formData.append("email", data.email);
      formData.append("password", data.password);
      if (data.phone) formData.append("phone", data.phone);
      formData.append("role_id", data.role_id);
      if (data.location_id) formData.append("location_id", data.location_id);

      const result = await createInvitation(null, formData);

      if (result?.credentials) {
        setCreatedCredentials(result.credentials);
        onInviteSent?.(`Account created for ${data.fullName} (${data.email})`);
      } else if (result?.message) {
        setErrorMsg(result.message);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-150 backdrop-blur-xs">
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200/60 text-indigo-700">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {createdCredentials ? "Team Member Account Ready" : "Add New Team Member"}
              </h2>
              <p className="text-xs text-slate-500">
                {createdCredentials ? "Account provisioned & credentials created" : "Set member name, role, and initial password"}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {createdCredentials ? (
            /* Success & Credentials Display View */
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200/80 p-3.5 text-xs text-emerald-800 flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Account created successfully!</p>
                  <p className="text-emerald-700 mt-0.5">
                    The employee can now log in immediately with the password you set. An email has also been sent to their inbox.
                  </p>
                </div>
              </div>

              {/* Credentials Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Login Credentials</span>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Earthly Aaromas ERP Login\nName: ${createdCredentials.fullName}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nRole: ${createdCredentials.roleName}\nBranch: ${createdCredentials.locationName}\nLogin at: ${window.location.origin}/employee-login`;
                      handleCopyText(text, "all");
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    {copiedField === "all" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied All!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy All Details</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Full Name</span>
                    <span className="font-medium text-slate-800">{createdCredentials.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Role</span>
                    <span className="font-medium text-slate-800">{createdCredentials.roleName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Email</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-slate-900 select-all">{createdCredentials.email}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(createdCredentials.email, "email")}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Copy email"
                      >
                        {copiedField === "email" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Password</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900 select-all">
                        {createdCredentials.password}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(createdCredentials.password, "pass")}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Copy password"
                      >
                        {copiedField === "pass" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Done Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg bg-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-semibold text-white shadow-2xs cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form View */
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Full Name & Email (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      {...form.register("fullName")}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-2xs"
                      placeholder="e.g. Rohit Sharma"
                    />
                  </div>
                  {form.formState.errors.fullName && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                      {form.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                    Email address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    {...form.register("email")}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-2xs"
                    placeholder="employee@company.com"
                  />
                  {form.formState.errors.email && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Field (Owner Set) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                    Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Auto-generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...form.register("password")}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-2xs pr-16"
                    placeholder="Set employee password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-[10px] flex items-center gap-1"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">
                    {form.formState.errors.password.message}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-slate-500">
                  The employee will use this password to sign in directly.
                </p>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Role Assignment <span className="text-rose-500">*</span>
                </label>
                
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
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
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wider">
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
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <span>Create &amp; Provision Member</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
