"use client";

import { useActionState } from "react";

import { signIn } from "@/modules/auth/services/auth.actions";

export function LoginForm() {
  const [state, action, isPending] = useActionState(signIn, null);

  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email address
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#4a632a] focus:ring-2 focus:ring-zinc-200"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#4a632a] focus:ring-2 focus:ring-zinc-200"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      {state?.message ? (
        <p aria-live="polite" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        className="w-full rounded-md bg-[#587333] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3a4f20] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

