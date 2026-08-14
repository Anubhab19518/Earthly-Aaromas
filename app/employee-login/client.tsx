"use client";

import { useActionState, useState } from "react";
import { employeeSignIn } from "@/modules/auth/services/employee-auth.actions";
import { Eye, EyeOff } from "lucide-react";

export function EmployeeLoginClient() {
  const [state, action, isPending] = useActionState(employeeSignIn, null);
  const [showPassword, setShowPassword] = useState(false);

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
        <div className="relative mt-1">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            className="block w-full rounded-md border border-zinc-300 px-3 py-2 pr-10 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
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

