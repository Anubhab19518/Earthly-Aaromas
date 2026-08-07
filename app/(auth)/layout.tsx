import type { ReactNode } from "react";

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <main className="grid min-h-full place-items-center bg-zinc-100 p-6">{children}</main>;
}
