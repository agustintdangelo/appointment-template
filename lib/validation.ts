import { z } from "zod";

import { isValidGenericPhoneNumber } from "@/lib/contact";

export const availabilityQuerySchema = z.object({
  businessSlug: z.string().trim().min(1),
  serviceId: z.string().min(1),
  staffMemberId: z.string().trim().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const contactPhoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .refine((value) => isValidGenericPhoneNumber(value));

export const bookingSchema = z.object({
  businessSlug: z.string().trim().min(1),
  serviceId: z.string().min(1),
  staffMemberId: z.string().trim().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotStart: z.string().datetime({ offset: true }),
  customerName: z.string().trim().min(1).max(80),
  customerEmail: z.string().trim().email(),
  customerPhone: contactPhoneSchema,
  notes: z.string().trim().max(500).optional(),
});

export const adminBookingSchema = z.object({
  serviceId: z.string().min(1),
  staffMemberId: z.string().trim().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotStart: z.string().datetime({ offset: true }),
  customerName: z.string().trim().min(1).max(80),
  customerEmail: z.string().trim().email(),
  customerPhone: contactPhoneSchema.optional(),
  notes: z.string().trim().max(500).optional(),
});

export const cancelAppointmentSchema = z.object({
  businessSlug: z.string().trim().min(1),
  appointmentId: z.string().min(1),
});

export const manageBookingLookupSchema = z.object({
  businessSlug: z.string().trim().min(1),
  confirmationCode: z.string().trim().min(1),
  customerEmail: z.string().trim().email(),
});
