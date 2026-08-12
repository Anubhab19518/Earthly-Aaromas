"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, UserX, Copy, Check, AlertTriangle } from "lucide-react";
import { deactivateEmployee } from "@/modules/team/services/team.actions";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSelf = member.user_id === currentUserId;
  const isOwner = member.role_code === "OWNER";
  const canDeactivate = !isSelf && member.status === "ACTIVE" && !isOwner;

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

  const handleCopyId = () => {
    navigator.clipboard.writeText(member.id);
    setCopied(true);
    onCopySuccess?.(`Copied Member ID for ${member.full_name}`);
    setTimeout(() => setCopied(false), 2000);
    setIsOpen(false);
  };

  const handleDeactivate = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("id", member.id);
      await deactivateEmployee(null, formData);
      setShowDeactivateModal(false);
      onCopySuccess?.(`${member.full_name} has been deactivated.`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all"
        title="More actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-9 z-50 min-w-[190px] origin-top-right rounded-xl border border-slate-200/90 bg-white p-1 shadow-lg shadow-slate-200/50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[11px] font-medium text-slate-400 border-b border-slate-100 mb-1">
            Actions for {member.full_name.split(" ")[0]}
          </div>

          <button
            onClick={handleCopyId}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            <span>Copy Member ID</span>
          </button>

          {canDeactivate && (
            <button
              onClick={() => {
                setIsOpen(false);
                setShowDeactivateModal(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors mt-0.5"
            >
              <UserX className="h-3.5 w-3.5 text-rose-500" />
              <span>Deactivate Member</span>
            </button>
          )}

          {!canDeactivate && (
            <div className="px-2.5 py-1 text-[11px] text-slate-400 italic">
              {isSelf ? "Current account" : isOwner ? "Organization Owner" : "Member suspended"}
            </div>
          )}
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
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50"
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
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all"
        title="More actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-9 z-50 min-w-[180px] origin-top-right rounded-xl border border-slate-200/90 bg-white p-1 shadow-lg shadow-slate-200/50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={handleCopyEmail}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            <span>Copy Email</span>
          </button>
        </div>
      )}
    </div>
  );
}
