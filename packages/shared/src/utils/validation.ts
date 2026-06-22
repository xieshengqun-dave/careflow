import { z } from "zod";

export const phoneNumberSchema = z
  .string()
  .regex(/^(\+?601)[0-46-9]-*[0-9]{7,8}$/, "Invalid Malaysian phone number");

export const otpSchema = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^\d+$/, "OTP must contain only digits");

export const bookingNotesSchema = z.string().max(500).optional();

export const clinicSearchSchema = z.object({
  query: z.string().min(1).max(100),
  state: z.string().optional(),
  city: z.string().optional(),
});
