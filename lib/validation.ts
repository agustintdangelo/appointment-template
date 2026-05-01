import { z } from "zod";

import { isValidGenericPhoneNumber } from "@/lib/contact";

export const availabilityQuerySchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  staffMemberId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const contactPhoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .refine((value) => isValidGenericPhoneNumber(value));

export const bookingSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  staffMemberId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotStart: z.string().datetime({ offset: true }),
  customerName: z.string().trim().min(1).max(80),
  customerEmail: z.string().trim().email(),
  customerPhone: contactPhoneSchema,
  notes: z.string().trim().max(500).optional(),
});
