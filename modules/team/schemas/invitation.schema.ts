import { z } from "zod";

export const createInvitationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  phone: z.string().optional().nullable(),
  role_id: z.string().uuid("Please select a role"),
  location_id: z.string().uuid().nullable().optional(),
});

export type CreateInvitationFormValues = z.infer<typeof createInvitationSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
  fullName: z.string().min(2, "Full name is required"),
  phoneNumber: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;

export const employeeLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type EmployeeLoginFormValues = z.infer<typeof employeeLoginSchema>;
