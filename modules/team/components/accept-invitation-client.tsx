"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { acceptInvitation } from "@/modules/team/services/invitation.actions";
import { acceptInvitationSchema, AcceptInvitationFormValues } from "@/modules/team/schemas/invitation.schema";
import { useRouter } from "next/navigation";

interface AcceptInvitationClientProps {
  token: string;
  email: string;
}

export function AcceptInvitationClient({ token, email }: AcceptInvitationClientProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      token,
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: AcceptInvitationFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      
      const formData = new FormData();
      formData.append("token", data.token);
      formData.append("fullName", data.fullName);
      if (data.phoneNumber) formData.append("phoneNumber", data.phoneNumber);
      formData.append("password", data.password);
      formData.append("confirmPassword", data.confirmPassword);

      const result = await acceptInvitation(null, formData);

      if (result?.message === "Success") {
        router.push("/employee-login?success=account_created");
      } else if (result?.message) {
        setErrorMsg(result.message);
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700">Email Address</label>
        <input
          type="email"
          value={email}
          disabled
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">Full Name *</label>
        <input
          type="text"
          {...form.register("fullName")}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
          placeholder="e.g., Jane Doe"
        />
        {form.formState.errors.fullName && (
          <p className="mt-1 text-sm text-red-600">{form.formState.errors.fullName.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">Phone Number (Optional)</label>
        <input
          type="tel"
          {...form.register("phoneNumber")}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
          placeholder="e.g., +1234567890"
        />
        {form.formState.errors.phoneNumber && (
          <p className="mt-1 text-sm text-red-600">{form.formState.errors.phoneNumber.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">Create Password *</label>
        <input
          type="password"
          {...form.register("password")}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
          placeholder="At least 8 characters"
        />
        {form.formState.errors.password && (
          <p className="mt-1 text-sm text-red-600">{form.formState.errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">Confirm Password *</label>
        <input
          type="password"
          {...form.register("confirmPassword")}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
        />
        {form.formState.errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{form.formState.errors.confirmPassword.message}</p>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
      >
        {isPending ? "Creating Account..." : "Set Up Account"}
      </button>
    </form>
  );
}

