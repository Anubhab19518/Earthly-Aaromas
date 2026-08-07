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
  return <input autoComplete="one-time-code" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-[#4a632a] focus:ring-2 focus:ring-zinc-200" inputMode="numeric" maxLength={6} onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))} placeholder="000000" value={code} />;
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

  return <div className="space-y-5">{qrCode ? <><img alt="Authenticator setup QR code" className="mx-auto h-52 w-52" src={qrCode} /><p className="sr-only">Scan the displayed QR code with your authenticator app.</p></> : <p className="text-sm text-zinc-600">Preparing your QR code…</p>}<p className="text-sm text-zinc-600">Scan the QR code in Google Authenticator or another TOTP app. If needed, enter this setup key manually:</p>{secret ? <code className="block break-all rounded bg-zinc-100 p-3 text-xs">{secret}</code> : null}<CodeInput code={code} onChange={setCode} />{error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}<button className="w-full rounded-md bg-[#587333] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" disabled={isVerifying || !factorId} onClick={verifyEnrollment} type="button">{isVerifying ? "Verifying…" : "Enable authenticator"}</button></div>;
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

  return <div className="space-y-5"><p className="text-sm text-zinc-600">Enter the current six-digit code from your authenticator app.</p><CodeInput code={code} onChange={setCode} />{error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}<button className="w-full rounded-md bg-[#587333] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" disabled={isVerifying} onClick={verifyCode} type="button">{isVerifying ? "Verifying…" : "Verify and continue"}</button></div>;
}

