"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, UserX, Copy, Check, AlertTriangle, KeyRound, Sparkles, Eye, EyeOff } from "lucide-react";
import { deactivateEmployee, resetEmployeePassword } from "@/modules/team/services/team.actions";

interface MemberActionMenuProps {
  member: {
    id: string;
    user_id: string;
    full_name: string;
    role: string;
    role_code: string;
    status: string;
  };
  currentUserId: string;
  onCopySuccess?: (msg: string) => void;
}

export function MemberActionMenu({ member, currentUserId, onCopySuccess }: MemberActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSelf = member.user_id === currentUserId;
  const isOwner = member.role_code === "OWNER";
  const canManage = !isSelf && member.status === "ACTIVE" && !isOwner;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pass = "Tea@";
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  const handleOpenPasswordModal = () => {
    setNewPassword(generateRandomPassword());
    setShowPassword(true);
    setPasswordSuccess(false);
    setErrorMsg(null);
    setShowPasswordModal(true);
    setIsOpen(false);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(member.id);
    setCopied(true);
    onCopySuccess?.(`Copied Member ID for ${member.full_name}`);
    setTimeout(() => setCopied(false), 2000);
    setIsOpen(false);
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("id", member.id);
      formData.append("newPassword", newPassword);
      const res = await resetEmployeePassword(null, formData);
      if (res?.message === "Password updated successfully.") {
        setPasswordSuccess(true);
        onCopySuccess?.(`Password updated for ${member.full_name}`);
      } else if (res?.message) {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("id", member.id);
      const res = await deactivateEmployee(null, formData);
      if (res?.message) {
        setErrorMsg(res.message);
        return;
      }
      setShowDeactivateModal(false);
      onCopySuccess?.(`${member.full_name} has been deactivated.`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to deactivate member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all cursor-pointer"
        title="More actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-9 z-50 min-w-[200px] origin-top-right rounded-xl border border-slate-200/90 bg-white p-1 shadow-xl shadow-slate-200/50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[11px] font-medium text-slate-400 border-b border-slate-100 mb-1">
            Actions for {member.full_name.split(" ")[0]}
          </div>

          <button
            onClick={handleCopyId}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            <span>Copy Member ID</span>
          </button>

          {canManage && (
            <>
              <button
                type="button"
                onClick={handleOpenPasswordModal}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                <span>Reset Password</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDeactivateModal(true);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                title="Deactivate Member"
              >
                <UserX className="h-3.5 w-3.5 text-rose-500" />
                <span>Deactivate</span>
              </button>
            </>
          )}

          {!canManage && (
            <div className="px-2.5 py-1 text-[11px] text-slate-400 border-t border-slate-100 mt-1">
              {isSelf ? "Current account" : isOwner ? "Organization Owner" : "Member suspended"}
            </div>
          )}
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900">Reset Employee Password</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Set a new password for <strong className="text-slate-800">{member.full_name}</strong>.
                </p>
              </div>
            </div>

            {passwordSuccess ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200/80 p-3 text-xs text-emerald-800 flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Password updated successfully!</p>
                    <p className="text-emerald-700 mt-0.5">
                      Share this new password with the employee:
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">New Password</span>
                    <span className="font-mono text-sm font-bold text-slate-900 select-all">{newPassword}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword);
                      onCopySuccess?.("Copied password to clipboard");
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="rounded-lg bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-2xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                      New Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewPassword(generateRandomPassword())}
                      className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Auto-generate</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-2xs pr-16"
                      placeholder="Minimum 6 characters"
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
                </div>

                {errorMsg && (
                  <div className="rounded-lg bg-rose-50 p-2.5 text-[11px] font-medium text-rose-600 border border-rose-200/80">
                    {errorMsg}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    {isSubmitting ? "Updating..." : "Set New Password"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deactivation Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900">Deactivate Team Member</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Are you sure you want to deactivate <span className="font-medium text-slate-800">{member.full_name}</span>? They will lose access to all organization resources immediately.
                </p>
                {errorMsg && (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                    {errorMsg}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Deactivating..." : "Deactivate Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface InvitationActionMenuProps {
  invitation: {
    id: string;
    email: string;
    expires_at: string;
    accepted_at: string | null;
  };
  onCopySuccess?: (msg: string) => void;
}

export function InvitationActionMenu({ invitation, onCopySuccess }: InvitationActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(invitation.email);
    setCopied(true);
    onCopySuccess?.(`Copied email ${invitation.email}`);
    setTimeout(() => setCopied(false), 2000);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all cursor-pointer"
        title="More actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-9 z-50 min-w-[180px] origin-top-right rounded-xl border border-slate-200/90 bg-white p-1 shadow-lg shadow-slate-200/50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={handleCopyEmail}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            <span>Copy Email</span>
          </button>
        </div>
      )}
    </div>
  );
}
