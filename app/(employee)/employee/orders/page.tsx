export default function EmployeeOrdersPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#eaf1e2] text-4xl">
        🛒
      </div>
      <h1 className="mt-6 text-2xl font-bold text-zinc-900">Order Module Coming Soon</h1>
      <p className="mt-3 max-w-md text-sm text-zinc-500">
        The Order &amp; POS module is under development. Once released, you will be able to take
        customer orders, generate bills, and process payments right here.
      </p>
      <a
        href="/employee"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#587333] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#587333]"
      >
        ← Back to Dashboard
      </a>
    </div>
  );
}
