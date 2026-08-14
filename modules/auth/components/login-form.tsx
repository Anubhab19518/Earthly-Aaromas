"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { signIn } from "@/modules/auth/services/auth.actions";

export function LoginForm() {
  const [state, action, isPending] = useActionState(signIn, null);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (step === 1) {
      e.preventDefault();
      if (email.trim()) setStep(2);
    }
  };

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label className="text-[13px] font-semibold text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          id="email"
          name="email"
          placeholder="name@company.com"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={step === 2}
          className={`w-full rounded-lg border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder:text-slate-400 ${step === 2 ? "bg-slate-50 text-slate-500" : "bg-transparent"}`}
        />
      </div>

      {step === 2 && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="text-[13px] font-semibold text-slate-700" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-200 bg-transparent px-4 py-2.5 pr-10 text-[14px] outline-none transition focus:border-sky-600 focus:ring-1 focus:ring-sky-600 placeholder:text-slate-400"
              id="password"
              name="password"
              placeholder="••••••••"
              required
              type={showPassword ? "text" : "password"}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
      )}
      {state?.message ? (
        <p aria-live="polite" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        className="w-full mt-2 rounded-lg bg-sky-600 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
        disabled={isPending || (step === 1 && !email.trim())}
        type="submit"
      >
        {step === 1 ? "Continue" : isPending ? "Signing in…" : "Sign in with Email"}
        {!isPending && (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        )}
      </button>

      <div className="mt-8 text-center text-[13px] font-medium text-slate-500">
        New to Earthly Aaromas? <a href="#" className="font-bold text-slate-900 hover:underline">Join now</a>
      </div>

      <div className="mt-16 text-center text-[11px] font-medium text-slate-400 space-y-2">
        <p>© 2026 Earthly Aaromas. Built for modern hospitality.</p>
        <div className="flex items-center justify-center gap-3">
          <a href="#" className="hover:text-slate-600">Privacy</a>
          <span>•</span>
          <a href="#" className="hover:text-slate-600">Terms</a>
          <span>•</span>
          <a href="#" className="hover:text-slate-600">Support</a>
        </div>
      </div>
    </form>
  );
}

