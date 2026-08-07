"use client";

import { useActionState } from "react";
import { employeeSignIn } from "@/modules/auth/services/employee-auth.actions";

export function EmployeeLoginClient() {
  const [state, action, isPending] = useActionState(employeeSignIn, null);

  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700">Email Address</label>
        <input
          name="email"
          type="email"
          required
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
          placeholder="employee@earthlyaaromas.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700">Password</label>
        <input
          name="password"
          type="password"
          required
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
        />
      </div>

      {state?.message && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white hover:bg-[#587333] disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

