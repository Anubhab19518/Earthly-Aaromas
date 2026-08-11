"use client";

import { signOut } from "@/modules/auth/services/auth.actions";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveBranchCookie } from "@/shared/lib/branch.actions";
import { Bell, Search, ChevronDown } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface TopNavProps {
  locations: Location[];
  userFullName: string;
  initialBranchId: string;
}

export function TopNav({ locations, userFullName, initialBranchId }: TopNavProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeBranch, setActiveBranch] = useState(initialBranchId);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBranchId = e.target.value;
    setActiveBranch(newBranchId);
    startTransition(async () => {
      await setActiveBranchCookie(newBranchId);
      router.refresh();
    });
  };

  const activeBranchName = locations.find(l => l.id === activeBranch)?.name || "Select Branch";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 gap-4">

      {/* Branch Switcher */}
      <div className="flex items-center gap-1 min-w-0">
        <div className="relative flex items-center">
          <select
            value={activeBranch}
            onChange={handleBranchChange}
            disabled={isPending}
            className="appearance-none bg-slate-50 border border-slate-200 rounded-md pl-3 pr-7 py-1.5 text-sm font-medium text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50 max-w-[180px]"
          >
            {locations.length === 0 && <option value="">No branches</option>}
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="block w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Search..."
          />
        </div>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-3">
        <button className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <Bell className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white shrink-0">
            {userFullName.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex flex-col min-w-0 hidden sm:flex">
            <span className="text-sm font-medium text-slate-900 leading-tight truncate max-w-[120px]">
              {userFullName || "User"}
            </span>
            <form action={signOut}>
              <button className="text-[11px] font-medium text-slate-500 hover:text-red-600 text-left transition-colors" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
