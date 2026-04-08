import { z } from "zod";

export const availabilityQuerySchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  staffMemberId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const bookingSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  staffMemberId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotStart: z.string().datetime({ offset: true }),
  customerName: z.string().trim().min(2).max(80),
  customerEmail: z.string().trim().email(),
  customerPhone: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(500).optional(),
});
