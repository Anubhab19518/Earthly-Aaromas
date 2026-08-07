import { redirect } from "next/navigation";
import { verifyInvitation } from "@/modules/team/services/invitation.actions";
import { AcceptInvitationClient } from "@/modules/team/components/accept-invitation-client";
import Image from "next/image";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AcceptInvitePage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token || typeof token !== "string") {
    redirect("/login");
  }

  const invitation = await verifyInvitation(token);

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Invalid Invitation</h2>
          <p className="mt-2 text-sm text-zinc-600">
            This invitation link is invalid, expired, or has already been used. Please request a new invitation from your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Image src="/logo.png" alt="Earthly Aaromas" width={120} height={120} className="object-contain" />
        </div>
        
        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-zinc-900 text-center mb-2">Set Up Your Account</h1>
          <p className="text-sm text-zinc-500 text-center mb-6">
            You have been invited to join <strong>{invitation.organization_name}</strong> as an{" "}
            <strong>{invitation.role_name}</strong>.
          </p>
          
          <AcceptInvitationClient token={token} email={invitation.email} />
        </div>
      </div>
    </div>
  );
}
