"use client";

import React, { createContext, useContext } from "react";

export interface BranchLocation {
  id: string;
  name: string;
  code?: string;
  type?: string;
}

interface BranchContextType {
  activeBranchId: string;
  activeBranchName: string;
  activeBranchType: string;
  locations: BranchLocation[];
  orgName: string;
}

const BranchContext = createContext<BranchContextType>({
  activeBranchId: "",
  activeBranchName: "All Locations",
  activeBranchType: "SHOP",
  locations: [],
  orgName: "Earthly Aaromas",
});

interface BranchProviderProps {
  children: React.ReactNode;
  activeBranchId: string;
  locations: BranchLocation[];
  orgName?: string;
}

export function BranchProvider({
  children,
  activeBranchId,
  locations,
  orgName = "Earthly Aaromas",
}: BranchProviderProps) {
  const activeBranch = locations.find((l) => l.id === activeBranchId);
  const activeBranchName = activeBranch?.name || "Main Warehouse & Store";
  const activeBranchType = activeBranch?.type || "WAREHOUSE";

  return (
    <BranchContext.Provider
      value={{
        activeBranchId,
        activeBranchName,
        activeBranchType,
        locations,
        orgName,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext() {
  return useContext(BranchContext);
}
