"use client";

import { useActionState } from "react";
import { assignEmployee } from "@/modules/auth/services/member.actions";

export function AssignEmployeeForm({ organizationId }: { organizationId: string }) {
  const [state, action, isPending] = useActionState(assignEmployee, null);
  return <form action={action} className="mt-6 flex max-w-lg gap-3"><input name="organizationId" type="hidden" value={organizationId} /><input className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-zinc-200" name="email" placeholder="employee@example.com" required type="email" /><button className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isPending} type="submit">{isPending ? "Assigning…" : "Assign employee"}</button>{state ? <p className={state.success ? "text-sm text-emerald-700" : "text-sm text-red-700"} role="status">{state.message}</p> : null}</form>;
}

