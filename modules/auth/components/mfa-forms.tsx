"use client";
/* eslint-disable @next/next/no-img-element -- Supabase supplies this ephemeral SVG as a data URI. */

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { totpCodeSchema } from "@/modules/auth/schemas/mfa.schema";

type MfaProps = { publishableKey: string; url: string };

function useMfaClient({ publishableKey, url }: MfaProps) {
  return useMemo(() => createBrowserClient(url, publishableKey), [publishableKey, url]);
}

function CodeInput({ code, onChange }: { code: string; onChange: (value: string) => void }) {
  return <input autoComplete="one-time-code" className="w-full rounded-lg border border-slate-200 bg-transparent px-4 py-2.5 text-center font-mono text-lg tracking-[0.3em] outline-none transition focus:border-sky-600 focus:ring-1 focus:ring-sky-600 placeholder:text-slate-400" inputMode="numeric" maxLength={6} onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))} placeholder="000000" value={code} />;
}

export function MfaEnrollmentForm(props: MfaProps) {
  const router = useRouter();
  const supabase = useMfaClient(props);
  const hasStarted = useRef(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    void (async () => {
      let enrollment = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Tea Chain ERP" });

      if (enrollment.error?.message.includes("already exists")) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const staleFactor = factors?.all.find(
          (factor) => factor.factor_type === "totp" && factor.friendly_name === "Tea Chain ERP" && factor.status === "unverified",
        );

        if (staleFactor) {
          await supabase.auth.mfa.unenroll({ factorId: staleFactor.id });
          enrollment = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Tea Chain ERP" });
        }
      }

      if (enrollment.error || !enrollment.data) {
        setError(enrollment.error?.message ?? "Could not start authenticator setup. Please sign in again.");
        return;
      }

      setFactorId(enrollment.data.id);
      setQrCode(enrollment.data.totp.qr_code);
      setSecret(enrollment.data.totp.secret);
    })();
  }, [supabase]);

  async function verifyEnrollment() {
    const result = totpCodeSchema.safeParse(code);
    if (!result.success || !factorId) { setError(result.error?.issues[0]?.message ?? "Authenticator setup is still loading."); return; }
    setIsVerifying(true); setError(null);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) { setError(challengeError?.message ?? "Could not start the authenticator verification challenge."); setIsVerifying(false); return; }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: result.data });
    if (verifyError) { setError(verifyError.message); setIsVerifying(false); return; }
    router.replace("/dashboard"); router.refresh();
  }

  return <div className="space-y-5">{qrCode ? <><img alt="Authenticator setup QR code" className="mx-auto h-52 w-52" src={qrCode} /><p className="sr-only">Scan the displayed QR code with your authenticator app.</p></> : <p className="text-sm text-zinc-600">Preparing your QR code…</p>}<p className="text-sm text-zinc-600">Scan the QR code in Google Authenticator or another TOTP app. If needed, enter this setup key manually:</p>{secret ? <code className="block break-all rounded bg-zinc-100 p-3 text-xs">{secret}</code> : null}<CodeInput code={code} onChange={setCode} />{error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}<button className="w-full rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" disabled={isVerifying || !factorId} onClick={verifyEnrollment} type="button">{isVerifying ? "Verifying…" : "Enable authenticator"}</button></div>;
}

export function MfaVerifyForm(props: MfaProps) {
  const router = useRouter();
  const supabase = useMfaClient(props);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  async function verifyCode() {
    const result = totpCodeSchema.safeParse(code);
    if (!result.success) { setError(result.error.issues[0]?.message ?? "Enter a valid code."); return; }
    setIsVerifying(true); setError(null);
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    const factorId = factors?.totp[0]?.id;
    if (factorsError || !factorId) { setError("No authenticator is available for this account."); setIsVerifying(false); return; }
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) { setError(challengeError?.message ?? "Could not start the verification challenge."); setIsVerifying(false); return; }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: result.data });
    if (verifyError) { setError(verifyError.message); setIsVerifying(false); return; }
    router.replace("/dashboard"); router.refresh();
  }

  return <div className="space-y-5"><CodeInput code={code} onChange={setCode} />{error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}<button className="w-full mt-2 rounded-lg bg-sky-600 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2" disabled={isVerifying} onClick={verifyCode} type="button">{isVerifying ? "Verifying…" : "Verify"}{!isVerifying && (<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>)}</button></div>;
}

