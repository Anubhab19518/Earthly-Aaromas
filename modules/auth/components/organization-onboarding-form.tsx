"use client";

import { useActionState } from "react";

import { bootstrapOrganization } from "@/modules/auth/services/organization.actions";

export function OrganizationOnboardingForm() {
  const [state, action, isPending] = useActionState(bootstrapOrganization, null);

  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="name">Organization name</label>
        <input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-zinc-200" id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="legalName">Legal name <span className="font-normal text-zinc-500">(optional)</span></label>
        <input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-zinc-200" id="legalName" name="legalName" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="gstin">GSTIN <span className="font-normal text-zinc-500">(optional)</span></label>
        <input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm uppercase outline-none focus:border-sky-600 focus:ring-2 focus:ring-zinc-200" id="gstin" maxLength={15} name="gstin" />
      </div>
      {state?.message ? <p aria-live="polite" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.message}</p> : null}
      <button className="w-full rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isPending} type="submit">
        {isPending ? "Creating organization…" : "Create organization"}
      </button>
    </form>
  );
}

