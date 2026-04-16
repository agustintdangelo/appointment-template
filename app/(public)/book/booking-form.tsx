"use client";

import { addDays, format } from "date-fns";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { formatMoney, formatServiceTiming } from "@/lib/format";

type BusinessOption = {
  id: string;
  name: string;
};

type ServiceOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  bufferMinutes: number;
  priceCents: number;
};

type StaffOption = {
  id: string;
  name: string;
  slug: string;
  title: string | null;
  bio: string | null;
};

type AvailabilitySlot = {
  startAt: string;
  endAt: string;
  label: string;
};

type BookingFormProps = {
  business: BusinessOption;
  services: ServiceOption[];
  staffMembers: StaffOption[];
};

function getInitialBookingDate() {
  const date = addDays(new Date(), 1);

  while (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }

  return format(date, "yyyy-MM-dd");
}

export default function BookingForm({
  business,
  services,
  staffMembers,
}: BookingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, startTransition] = useTransition();
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id ?? "");
  const [selectedStaffId, setSelectedStaffId] = useState(staffMembers[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState(() => getInitialBookingDate());
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const selectedStaff = staffMembers.find((staffMember) => staffMember.id === selectedStaffId);

  useEffect(() => {
    const requestedSlug = searchParams.get("service");

    if (!requestedSlug) {
      return;
    }

    const matchingService = services.find((service) => service.slug === requestedSlug);

    if (matchingService && matchingService.id !== selectedServiceId) {
      setSelectedServiceId(matchingService.id);
    }
  }, [searchParams, selectedServiceId, services]);

  useEffect(() => {
    setSelectedSlot("");
    setAvailabilityError(null);

    if (!selectedServiceId || !selectedStaffId || !selectedDate) {
      setSlots([]);
      return;
    }

    let isCancelled = false;

    async function loadAvailability() {
      setIsLoadingSlots(true);

      try {
        const params = new URLSearchParams({
          businessId: business.id,
          serviceId: selectedServiceId,
          staffMemberId: selectedStaffId,
          date: selectedDate,
        });

        const response = await fetch(`/api/availability?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          error?: string;
          slots?: AvailabilitySlot[];
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load availability.");
        }

        if (!isCancelled) {
          setSlots(payload.slots ?? []);
        }
      } catch (error) {
        if (!isCancelled) {
          setSlots([]);
          setAvailabilityError(
            error instanceof Error ? error.message : "Unable to load availability.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSlots(false);
        }
      }
    }

    void loadAvailability();

    return () => {
      isCancelled = true;
    };
  }, [
    availabilityRefreshKey,
    business.id,
    selectedDate,
    selectedServiceId,
    selectedStaffId,
  ]);

  async function submitBooking() {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        businessId: business.id,
        serviceId: selectedServiceId,
        staffMemberId: selectedStaffId,
        date: selectedDate,
        slotStart: selectedSlot,
        customerName,
        customerEmail,
        customerPhone,
        notes,
      }),
    });

    const payload = (await response.json()) as {
      appointmentId?: string;
      error?: string;
    };

    if (!response.ok) {
      setBookingError(payload.error ?? "Unable to create the appointment.");

      if (response.status === 409) {
        setAvailabilityRefreshKey((currentValue) => currentValue + 1);
      }

      return;
    }

    router.push(`/book/confirmation/${payload.appointmentId}`);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingError(null);

    if (!selectedSlot) {
      setBookingError("Choose an available slot before confirming the booking.");
      return;
    }

    startTransition(() => {
      void submitBooking();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <form
        onSubmit={handleSubmit}
        className="brand-panel-shadow rounded-[2rem] border border-border bg-card/95 p-8"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Service
            <select
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
              value={selectedServiceId}
              onChange={(event) => setSelectedServiceId(event.target.value)}
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Staff member
            <select
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
              value={selectedStaffId}
              onChange={(event) => setSelectedStaffId(event.target.value)}
            >
              {staffMembers.map((staffMember) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {staffMember.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium md:col-span-2">
            Date
            <input
              type="date"
              min={format(new Date(), "yyyy-MM-dd")}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl">Available slots</h2>
            {isLoadingSlots ? <p className="text-sm text-muted">Checking...</p> : null}
          </div>

          {availabilityError ? (
            <p className="mt-4 rounded-2xl bg-highlight-surface px-4 py-3 text-sm text-highlight-foreground">
              {availabilityError}
            </p>
          ) : null}

          {!availabilityError && !isLoadingSlots && slots.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
              No slots are open for that date and staff combination.
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={slot.startAt}
                type="button"
                onClick={() => setSelectedSlot(slot.startAt)}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  selectedSlot === slot.startAt
                    ? "brand-accent-fill border-accent"
                    : "border-border bg-surface hover:border-accent"
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Customer name
            <input
              required
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              required
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Phone
            <input
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Notes
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
          </label>
        </div>

        {bookingError ? (
          <p className="mt-6 rounded-2xl bg-highlight-surface px-4 py-3 text-sm text-highlight-foreground">
            {bookingError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="brand-accent-fill mt-8 rounded-full px-6 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Confirming..." : "Confirm booking"}
        </button>
      </form>

      <aside className="rounded-[2rem] border border-border bg-surface/90 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          Booking summary
        </p>

        {selectedService ? (
          <div className="mt-5 rounded-[1.5rem] bg-card p-6">
            <h2 className="font-display text-3xl">{selectedService.name}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{selectedService.description}</p>
            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Timing</dt>
                <dd>{formatServiceTiming(selectedService.durationMinutes, selectedService.bufferMinutes)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Price</dt>
                <dd className="font-semibold">{formatMoney(selectedService.priceCents)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Staff</dt>
                <dd>{selectedStaff?.name ?? "Select staff"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Date</dt>
                <dd>{selectedDate}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Slot</dt>
                <dd>{slots.find((slot) => slot.startAt === selectedSlot)?.label ?? "Not selected"}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="mt-5 rounded-[1.5rem] bg-card p-6 text-sm leading-7 text-muted">
          <p>{business.name} is running the first reusable MVP slice.</p>
          <p className="mt-3">
            This form keeps the business logic on the server and rechecks the slot before writing
            the appointment.
          </p>
        </div>
      </aside>
    </div>
  );
}
