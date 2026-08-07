import { z } from "zod";

export const totpCodeSchema = z.string().regex(/^\d{6}$/, "Enter the current six-digit authenticator code.");
