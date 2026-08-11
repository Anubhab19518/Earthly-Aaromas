"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaxCategory, TaxRate, createTaxRateSchema, CreateTaxRateFormValues } from "@/modules/taxes/schemas/tax.schema";
import { createTaxRate, deleteTaxRate } from "@/modules/taxes/services/tax.actions";

interface TaxRatesPanelProps {
  category: TaxCategory;
  rates: TaxRate[];
  open: boolean;
  onClose: () => void;
}

export function TaxRatesPanel({ category, rates, open, onClose }: TaxRatesPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const categoryRates = rates
    .filter((r) => r.tax_category_id === category.id)
    .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());

  const form = useForm<CreateTaxRateFormValues>({
    resolver: zodResolver(createTaxRateSchema),
    defaultValues: {
      tax_category_id: category.id,
      rate_percentage: 0,
      effective_from: new Date().toISOString().split("T")[0],
    },
  });

  if (!open) return null;

  const onSubmit = (data: CreateTaxRateFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("tax_category_id", data.tax_category_id);
      formData.append("rate_percentage", String(data.rate_percentage));
      formData.append("effective_from", data.effective_from);

      const result = await createTaxRate(null, formData);

      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        setIsAdding(false);
        form.reset({
          tax_category_id: category.id,
          rate_percentage: 0,
          effective_from: new Date().toISOString().split("T")[0],
        });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this tax rate?")) return;

    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("id", id);
      const result = await deleteTaxRate(null, formData);
      if (result?.message) {
        setErrorMsg(result.message);
      }
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Tax Rates</h2>
            <p className="text-sm text-zinc-500">{category.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {errorMsg && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{errorMsg}</div>}

          {isAdding ? (
            <div className="mb-6 rounded-lg border border-zinc-200 p-4">
              <h3 className="mb-3 text-sm font-medium text-zinc-900">Add New Rate</h3>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700">Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    {...form.register("rate_percentage", { valueAsNumber: true })}
                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                  />
                  {form.formState.errors.rate_percentage && (
                    <p className="mt-1 text-xs text-red-600">{form.formState.errors.rate_percentage.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700">Effective From (YYYY-MM-DD) *</label>
                  <input
                    type="date"
                    {...form.register("effective_from")}
                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                  />
                  {form.formState.errors.effective_from && (
                    <p className="mt-1 text-xs text-red-600">{form.formState.errors.effective_from.message}</p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {isPending ? "Saving..." : "Save Rate"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="mb-6 w-full rounded-md border border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
            >
              + Add New Rate
            </button>
          )}

          <div>
            <h3 className="mb-3 text-sm font-medium text-zinc-900">Rate History</h3>
            {categoryRates.length === 0 ? (
              <p className="text-sm text-zinc-500">No rates configured yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-200">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-zinc-500">Effective From</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-zinc-500">Rate</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium uppercase text-zinc-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {categoryRates.map((rate) => {
                      const isFuture = new Date(rate.effective_from).getTime() > new Date().getTime();
                      return (
                        <tr key={rate.id} className="hover:bg-zinc-50">
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm text-zinc-900">
                            {rate.effective_from}
                            {isFuture && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                Future
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-zinc-900">
                            {Number(rate.rate_percentage).toFixed(2)}%
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm">
                            <button
                              onClick={() => handleDelete(rate.id)}
                              disabled={isPending}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

