"use client";

import { useState } from "react";
import { InviteEmployeeDialog } from "./invite-employee-dialog";
import { format } from "date-fns";

interface TeamManagementClientProps {
  members: any[];
  invitations: any[];
  roles: any[];
  locations: any[];
  currentUserId: string;
}

export function TeamManagementClient({ members, invitations, roles, locations, currentUserId }: TeamManagementClientProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-end">
        <button
          onClick={() => setIsInviteOpen(true)}
          className="rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white hover:bg-[#587333]"
        >
          Invite Employee
        </button>
      </div>

      <div className="grid gap-8 grid-cols-1">
        {/* Active Members Table */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
            <h3 className="text-sm font-semibold text-zinc-900">Active Members</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-zinc-500">
                      No active members found.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id} className={`hover:bg-zinc-50 ${member.status === 'SUSPENDED' ? 'opacity-60' : ''}`}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">
                        {member.full_name} {member.user_id === currentUserId && <span className="text-xs text-zinc-400 font-normal ml-2">(You)</span>}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${member.role_code === 'OWNER' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {member.role}
                        </span>
                      </td>
                      <td suppressHydrationWarning className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                        {member.joined_at ? format(new Date(member.joined_at), "MMM d, yyyy") : "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                        {member.status === "ACTIVE" ? (
                           <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
                        ) : (
                           <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800">Suspended</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        {member.user_id !== currentUserId && member.status === "ACTIVE" && member.role_code !== "OWNER" && (
                          <form action={async (formData) => {
                            const { deactivateEmployee } = await import("@/modules/team/services/team.actions");
                            await deactivateEmployee(null, formData);
                          }}>
                            <input type="hidden" name="id" value={member.id} />
                            <button type="submit" className="text-red-600 hover:text-red-900">
                              Deactivate
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Invitations Table */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
            <h3 className="text-sm font-semibold text-zinc-900">Pending Invitations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {invitations.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-zinc-500">
                      No pending invitations.
                    </td>
                  </tr>
                ) : (
                  invitations.map((inv) => {
                    const isExpired = new Date(inv.expires_at) < new Date();
                    const isAccepted = !!inv.accepted_at;
                    return (
                      <tr key={inv.id} className="hover:bg-zinc-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">
                          {inv.email}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                          {inv.roles?.name || "Unknown"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {isAccepted ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                              Accepted
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                              Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <InviteEmployeeDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        roles={roles}
        locations={locations}
      />
    </div>
  );
}
