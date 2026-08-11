import type { ReactNode } from "react";

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <main className="grid min-h-screen w-full place-items-center bg-transparent p-6">{children}</main>;
}
