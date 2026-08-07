import { z } from "zod";

export const supplierSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string().min(2, "Name must be at least 2 characters").max(160, "Name must be less than 160 characters"),
  phone: z
    .string()
    .regex(/^[+]?[0-9\s\-().]{7,20}$/, "Invalid phone format")
    .nullable()
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email format")
    .nullable()
    .optional()
    .or(z.literal("")),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format")
    .nullable()
    .optional()
    .or(z.literal("")),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type Supplier = z.infer<typeof supplierSchema>;

export const createSupplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(160, "Name must be less than 160 characters"),
  phone: z
    .string()
    .regex(/^[+]?[0-9\s\-().]{7,20}$/, "Invalid phone format")
    .nullable()
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email format")
    .nullable()
    .optional()
    .or(z.literal("")),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)")
    .nullable()
    .optional()
    .or(z.literal("")),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CreateSupplierFormValues = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.and(
  z.object({
    id: z.string().uuid(),
  })
);

export type UpdateSupplierFormValues = z.infer<typeof updateSupplierSchema>;

export const deleteSupplierSchema = z.object({
  id: z.string().uuid(),
});
