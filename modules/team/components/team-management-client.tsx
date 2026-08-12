"use client";

import { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  X, 
  Filter, 
  Check, 
  Copy,
  Layers, 
  Table, 
  Columns3, 
  ArrowUpDown, 
  LayoutGrid,
  Building2,
  Mail
} from "lucide-react";
import { InviteEmployeeDialog } from "./invite-employee-dialog";
import { MemberActionMenu, InvitationActionMenu } from "./team-action-menu";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";
import { UserCheck, ShieldCheck } from "lucide-react";

interface TeamManagementClientProps {
  members: any[];
  invitations: any[];
  roles: any[];
  locations: any[];
  currentUserId: string;
}

export function TeamManagementClient({
  members,
  invitations,
  roles,
  locations,
  currentUserId,
}: TeamManagementClientProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "members" | "invitations">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyEmail = (email: string) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    showToast(`Copied ${email} to clipboard`);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.location_name && m.location_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole =
        selectedRoleFilter === "all" || m.role_code === selectedRoleFilter;
      const matchesStatus =
        selectedStatusFilter === "all" || m.status === selectedStatusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [members, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Filtered invitations
  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      const roleName = inv.roles?.name || "";
      const matchesSearch =
        inv.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.full_name && inv.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.location_name && inv.location_name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [invitations, searchQuery]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-white shadow-xl animate-in slide-in-from-bottom-4 duration-200">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Organization & Access"
        title="Team Directory & Access Roles"
        description="Manage workspace members, pending invites, branch permissions, and role assignments"
        icon={UserCheck}
        iconBgColor="bg-indigo-600 text-white"
        tabs={[
          { id: "team-members", label: "Active Members", icon: UserCheck, count: members.length },
          { id: "team-invitations", label: "Pending Invitations", icon: Mail, count: invitations.length },
          { id: "team-roles", label: "Access Roles", icon: ShieldCheck, count: roles.length },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Invite Member</span>
          </button>
        }
      />

      {/* Main Card Container */}
      <div id="team-members" className="bg-white shadow-xs overflow-hidden rounded-xl border border-slate-200">
        
        {/* Top View Tabs (Airtable / Linear / Figma Table View Tabs) */}
        <div className="flex items-center gap-1 bg-slate-50/70 px-4 pt-2.5 overflow-x-auto select-none">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-all ${
              activeTab === "all"
                ? "bg-white text-slate-900 border border-b-white border-slate-200/90 shadow-2xs font-semibold -mb-px z-10"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>All accounts</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-500">
              {members.length + invitations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-all ${
              activeTab === "members"
                ? "bg-white text-slate-900 border border-b-white border-slate-200/90 shadow-2xs font-semibold -mb-px z-10"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Active members</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-500">
              {members.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("invitations")}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-all ${
              activeTab === "invitations"
                ? "bg-white text-slate-900 border border-b-white border-slate-200/90 shadow-2xs font-semibold -mb-px z-10"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Pending invitations</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-500">
              {invitations.length}
            </span>
          </button>

          <div className="h-4 w-px bg-slate-200/80 mx-1" />

          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-1 rounded-t-lg px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            <span>Add</span>
          </button>
        </div>

        {/* Toolbar Bar */}
        <div className="flex flex-col gap-2.5 border-b border-slate-200/80 bg-white px-4 py-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3 overflow-x-auto py-0.5">
            <button className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer">
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>Groups</span>
            </button>

            <div className="h-3.5 w-px bg-slate-200" />

            {/* Filter Dropdown Controls */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer hover:text-slate-900"
              >
                <option value="all">Filters (All Roles)</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.code}>
                    Role: {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-3.5 w-px bg-slate-200" />

            <button className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer">
              <Table className="h-3.5 w-3.5 text-slate-500" />
              <span>Group by</span>
            </button>

            <button className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer">
              <Columns3 className="h-3.5 w-3.5 text-slate-500" />
              <span>Fields</span>
            </button>

            <button className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
              <span>Row height</span>
            </button>

            <button className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer">
              <LayoutGrid className="h-3.5 w-3.5 text-slate-500" />
              <span>Layout</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-md border border-slate-200/80 bg-slate-50/50 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Data Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-50/50 text-xs font-semibold text-slate-700">
                <th className="py-2.5 px-4 border-r border-slate-200/80 w-[20%]">Name</th>
                <th className="py-2.5 px-4 border-r border-slate-200/80 w-[22%]">Email</th>
                <th className="py-2.5 px-4 border-r border-slate-200/80 w-[16%]">Role</th>
                <th className="py-2.5 px-4 border-r border-slate-200/80 w-[18%]">Branch Location</th>
                <th className="py-2.5 px-4 border-r border-slate-200/80 w-[14%]">Joined Date</th>
                <th className="py-2.5 px-4 border-r border-slate-200/80 w-[12%]">Status</th>
                <th className="py-2.5 px-4 text-right w-[4%]">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/80 text-xs font-normal text-slate-800">
              {/* Render Active Members */}
              {(activeTab === "all" || activeTab === "members") && (
                filteredMembers.length === 0 && activeTab === "members" ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-normal border-r border-slate-200/80">
                      No active members found.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const isCurrentUser = member.user_id === currentUserId;

                    return (
                      <tr
                        key={`member-${member.id}`}
                        className="border-b border-slate-200/80 hover:bg-slate-50/60 transition-colors group"
                      >
                        {/* Name Cell */}
                        <td className="py-3 px-4 border-r border-slate-200/80 font-medium text-slate-900">
                          <div className="flex items-center justify-between gap-2">
                            <span>{member.full_name}</span>
                            {isCurrentUser && (
                              <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[10px] font-medium text-indigo-600 border border-indigo-200/50">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Email Cell (With hover copy button!) */}
                        <td className="py-3 px-4 border-r border-slate-200/80">
                          <div className="group/email flex items-center justify-between gap-2">
                            <span className="truncate text-slate-700 font-normal" title={member.email}>
                              {member.email}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(member.email)}
                              className="opacity-0 group-hover/email:opacity-100 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer shadow-2xs"
                              title="Copy email"
                            >
                              {copiedEmail === member.email ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Role Cell */}
                        <td className="py-3 px-4 border-r border-slate-200/80">
                          <span
                            className={`inline-flex items-center rounded-md border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs ${
                              member.role_code === "OWNER"
                                ? "bg-purple-50/80 text-purple-700 border-purple-200/60"
                                : member.role_code === "ADMIN"
                                ? "bg-indigo-50/80 text-indigo-700 border-indigo-200/60"
                                : "bg-slate-50 text-slate-700"
                            }`}
                          >
                            {member.role}
                          </span>
                        </td>

                        {/* Branch Location Cell */}
                        <td className="py-3 px-4 border-r border-slate-200/80 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{member.location_name || "All Branches"}</span>
                          </div>
                        </td>

                        {/* Joined Date Cell */}
                        <td className="py-3 px-4 border-r border-slate-200/80 text-slate-600 font-normal">
                          {member.joined_at
                            ? format(new Date(member.joined_at), "MMM d, yyyy")
                            : "-"}
                        </td>

                        {/* Status Cell (Matching Health Score style in screenshot) */}
                        <td className="py-3 px-4 border-r border-slate-200/80">
                          {member.status === "ACTIVE" ? (
                            <div className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
                              <span className="h-2 w-2 rounded-[2px] bg-emerald-500" />
                              <span>Active</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
                              <span className="h-2 w-2 rounded-[2px] bg-rose-500" />
                              <span>Suspended</span>
                            </div>
                          )}
                        </td>

                        {/* Actions Cell */}
                        <td className="py-3 px-4 text-right">
                          <MemberActionMenu
                            member={member}
                            currentUserId={currentUserId}
                            onCopySuccess={showToast}
                          />
                        </td>
                      </tr>
                    );
                  })
                )
              )}

              {/* Render Pending Invitations */}
              {(activeTab === "all" || activeTab === "invitations") && (
                filteredInvitations.length === 0 && activeTab === "invitations" ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-normal border-r border-slate-200/80">
                      No pending invitations found.
                    </td>
                  </tr>
                ) : (
                  filteredInvitations.map((inv) => {
                    const isExpired = isPast(new Date(inv.expires_at));
                    const isAccepted = !!inv.accepted_at;

                    return (
                      <tr
                        key={`inv-${inv.id}`}
                        className="border-b border-slate-200/80 hover:bg-slate-50/60 transition-colors group"
                      >
                        {/* Name Cell */}
                        <td className="py-3 px-4 border-r border-slate-200/80 font-medium text-slate-900">
                          {inv.full_name || "Invited Member"}
                        </td>

                        {/* Email Cell (With hover copy button!) */}
                        <td className="py-3 px-4 border-r border-slate-200/80">
                          <div className="group/email flex items-center justify-between gap-2">
                            <span className="truncate text-slate-700 font-normal" title={inv.email}>
                              {inv.email}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(inv.email)}
                              className="opacity-0 group-hover/email:opacity-100 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer shadow-2xs"
                              title="Copy email"
                            >
                              {copiedEmail === inv.email ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Role Cell */}
                        <td className="py-3 px-4 border-r border-slate-200/80">
                          <span className="inline-flex items-center rounded-md border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
                            {inv.roles?.name || "Member"}
                          </span>
                        </td>

                        {/* Branch Location Cell */}
                        <td className="py-3 px-4 border-r border-slate-200/80 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{inv.location_name || "All Branches"}</span>
                          </div>
                        </td>

                        {/* Expiration Time */}
                        <td className="py-3 px-4 border-r border-slate-200/80 text-slate-600 font-normal">
                          {formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}
                        </td>

                        {/* Status Cell (Matching Health Score style in screenshot) */}
                        <td className="py-3 px-4 border-r border-slate-200/80">
                          {isAccepted ? (
                            <div className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
                              <span className="h-2 w-2 rounded-[2px] bg-emerald-500" />
                              <span>Accepted</span>
                            </div>
                          ) : isExpired ? (
                            <div className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
                              <span className="h-2 w-2 rounded-[2px] bg-rose-500" />
                              <span>Expired</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
                              <span className="h-2 w-2 rounded-[2px] bg-amber-500" />
                              <span>Pending</span>
                            </div>
                          )}
                        </td>

                        {/* Actions Cell */}
                        <td className="py-3 px-4 text-right">
                          <InvitationActionMenu
                            invitation={inv}
                            onCopySuccess={showToast}
                          />
                        </td>
                      </tr>
                    );
                  })
                )
              )}

              {/* Total empty state when neither members nor invitations exist */}
              {filteredMembers.length === 0 && filteredInvitations.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-normal">
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Employee Modal */}
      <InviteEmployeeDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        roles={roles}
        locations={locations}
        onInviteSent={showToast}
      />
    </div>
  );
}
