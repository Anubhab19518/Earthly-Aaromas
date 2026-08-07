import { z } from "zod";

export const locationSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  location_type_id: z.string().uuid(),
  name: z.string().min(2, "Name must be at least 2 characters").max(160, "Name must be less than 160 characters"),
  code: z.string().regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase letters, numbers, underscores, or hyphens"),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email("Invalid email address").nullable().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type Location = z.infer<typeof locationSchema>;

export const locationTypeSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

export type LocationType = z.infer<typeof locationTypeSchema>;

export const createLocationSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  location_type_id: z.string().uuid({ message: "Please select a location type" }),
  name: z.string().min(2, "Name must be at least 2 characters").max(160, "Name must be less than 160 characters"),
  code: z.string().regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase letters, numbers, underscores, or hyphens"),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email("Invalid email address").nullable().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CreateLocationFormValues = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = createLocationSchema.extend({
  id: z.string().uuid(),
});

export type UpdateLocationFormValues = z.infer<typeof updateLocationSchema>;

export const deleteLocationSchema = z.object({
  id: z.string().uuid(),
});
