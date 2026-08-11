"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createLocation, updateLocation } from "@/modules/locations/services/location.actions";
import { createLocationSchema, CreateLocationFormValues, LocationType, Location } from "@/modules/locations/schemas/location.schema";

interface LocationDialogProps {
  location?: Location & { location_types?: { code: string; name: string } };
  locationTypes: LocationType[];
  locations: Location[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationDialog({ location, locationTypes, locations, open, onOpenChange }: LocationDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<CreateLocationFormValues>({
    resolver: zodResolver(createLocationSchema),
    defaultValues: {
      location_type_id: location?.location_type_id || "",
      parent_id: location?.parent_id || null,
      name: location?.name || "",
      code: location?.code || "",
      address: location?.address || "",
      phone: location?.phone || "",
      email: location?.email || "",
      status: location?.status || "ACTIVE",
    },
  });

  const selectedTypeId = form.watch("location_type_id");
  const selectedType = locationTypes.find((t) => t.id === selectedTypeId);
  
  useEffect(() => {
    if (open) {
      form.reset({
        location_type_id: location?.location_type_id || "",
        parent_id: location?.parent_id || null,
        name: location?.name || "",
        code: location?.code || "",
        address: location?.address || "",
        phone: location?.phone || "",
        email: location?.email || "",
        status: location?.status || "ACTIVE",
      });
      setErrorMsg(null);
    }
  }, [open, location, form]);

  useEffect(() => {
    if (selectedType?.code === "WAREHOUSE") {
      form.setValue("parent_id", null);
    }
  }, [selectedType, form]);

  const onSubmit = (data: CreateLocationFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      
      const formData = new FormData();
      if (location) formData.append("id", location.id);
      if (data.parent_id) formData.append("parent_id", data.parent_id);
      formData.append("location_type_id", data.location_type_id);
      formData.append("name", data.name);
      formData.append("code", data.code);
      if (data.address) formData.append("address", data.address);
      if (data.phone) formData.append("phone", data.phone);
      if (data.email) formData.append("email", data.email);
      formData.append("status", data.status);

      const result = location 
        ? await updateLocation(null, formData)
        : await createLocation(null, formData);

      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  const validParents = locations.filter(l => {
    const t = locationTypes.find(type => type.id === l.location_type_id);
    return t?.code === "WAREHOUSE" && l.id !== location?.id;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">{location ? "Edit Location" : "Add Location"}</h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-zinc-700">Location Type *</label>
            <select
              {...form.register("location_type_id")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              disabled={!!location}
            >
              <option value="">Select a type...</option>
              {locationTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {form.formState.errors.location_type_id && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.location_type_id.message}</p>
            )}
          </div>

          {selectedType?.code === "SHOP" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700">Parent Warehouse *</label>
              <select
                {...form.register("parent_id")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              >
                <option value="">Select a warehouse...</option>
                {validParents.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.parent_id && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.parent_id.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Name *</label>
              <input
                {...form.register("name")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Code *</label>
              <input
                {...form.register("code")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
              {form.formState.errors.code && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.code.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Address</label>
            <input
              {...form.register("address")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Phone</label>
              <input
                {...form.register("phone")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Email</label>
              <input
                {...form.register("email")}
                type="email"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Status *</label>
            <select
              {...form.register("status")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

