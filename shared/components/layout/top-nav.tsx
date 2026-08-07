"use client";

import { signOut } from "@/modules/auth/services/auth.actions";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveBranchCookie } from "@/shared/lib/branch.actions";

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

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6">
      
      {/* Left side: Branch Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Active Branch</span>
          <select 
            value={activeBranch}
            onChange={handleBranchChange}
            disabled={isPending}
            className="border-none bg-transparent p-0 text-sm font-semibold text-zinc-900 outline-none focus:ring-0 cursor-pointer disabled:opacity-50"
          >
            {locations.length === 0 && <option value="">No branches</option>}
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Middle: Global Search (Placeholder) */}
      <div className="flex-1 px-8 max-w-2xl">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full rounded-md border border-zinc-300 py-1.5 pl-10 pr-3 text-sm placeholder-zinc-400 focus:border-[#587333] focus:outline-none focus:ring-1 focus:ring-[#587333]"
            placeholder="Search..."
          />
        </div>
      </div>

      {/* Right side: User Profile */}
      <div className="flex items-center gap-4">
        <button className="text-zinc-400 hover:text-zinc-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-zinc-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#587333] text-sm font-medium text-white">
            {userFullName.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-900">{userFullName || "User"}</span>
            <form action={signOut}>
              <button className="text-[11px] font-medium text-zinc-500 hover:text-red-600 text-left" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
