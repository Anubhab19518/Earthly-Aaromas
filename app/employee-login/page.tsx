import { EmployeeLoginClient } from "./client";
import Image from "next/image";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EmployeeLoginPage({ searchParams }: Props) {
  const { success } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Image src="/logo.png" alt="Earthly Aaromas" width={140} height={140} className="object-contain" />
          </div>
          
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-900">
              Employee Login
            </h1>
            
            {success === "account_created" && (
              <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
                Account set up successfully. You can now log in.
              </div>
            )}
            
            <EmployeeLoginClient />
          </div>
        </div>
      </div>
    </div>
  );
}
