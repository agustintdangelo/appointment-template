"use client";

import { addDays, format } from "date-fns";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { isValidGenericPhoneNumber } from "@/lib/contact";
import { formatMoney, formatServiceTiming } from "@/lib/format";
import { t, type AppLocale } from "@/lib/i18n";
import { buildPublicBusinessPath } from "@/lib/tenant";

type BusinessOption = {
  id: string;
  name: string;
  slug: string;
};

type ServiceOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  prepMinutes: number;
  bufferMinutes: number;
  priceCents: number;
  staffLinks?: Array<{ staffMemberId: string }>;
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
  assignedStaffMemberId: string;
  staffMemberName: string;
};

type BookingFormProps = {
  business: BusinessOption;
  services: ServiceOption[];
  staffMembers: StaffOption[];
  locale: AppLocale;
};

type BookingFieldErrors = Partial<
  Record<"customerName" | "customerEmail" | "customerPhone", string>
>;

function getInitialBookingDate() {
  const date = addDays(new Date(), 1);

  while (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }

  return format(date, "yyyy-MM-dd");
}

function formatSlotTime(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function BookingForm({
  business,
  services,
  staffMembers,
  locale,
}: BookingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, startTransition] = useTransition();
  const [hasStartedBooking, setHasStartedBooking] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
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
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const capableStaffIds = selectedService
    ? new Set(selectedService.staffLinks?.map((link) => link.staffMemberId) ?? [])
    : null;
  const availableStaffMembers = capableStaffIds
    ? staffMembers.filter((staffMember) => capableStaffIds.has(staffMember.id))
    : staffMembers;
  const selectedStaff = availableStaffMembers.find(
    (staffMember) => staffMember.id === selectedStaffId,
  );

  useEffect(() => {
    if (!selectedStaffId || !selectedService) {
      return;
    }
    const capable = new Set(
      selectedService.staffLinks?.map((link) => link.staffMemberId) ?? [],
    );
    if (!capable.has(selectedStaffId)) {
      setSelectedStaffId("");
    }
  }, [selectedService, selectedStaffId]);
  const selectedSlotDetails = slots.find((slot) => slot.startAt === selectedSlot);
  const selectedSlotLabel = selectedSlotDetails
    ? formatSlotTime(selectedSlotDetails.startAt, locale)
    : undefined;
  const hasRequiredBookingFields =
    Boolean(selectedServiceId) &&
    Boolean(selectedDate) &&
    Boolean(selectedSlot) &&
    customerName.trim().length > 0 &&
    customerEmail.trim().length > 0 &&
    customerPhone.trim().length > 0;
  const confirmDisabled = isSubmitting || !hasRequiredBookingFields;

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

    if (!selectedServiceId || !selectedDate) {
      setSlots([]);
      return;
    }

    let isCancelled = false;

    async function loadAvailability() {
      setIsLoadingSlots(true);

      try {
        const params = new URLSearchParams({
          businessSlug: business.slug,
          serviceId: selectedServiceId,
          date: selectedDate,
          locale,
        });

        if (selectedStaffId) {
          params.set("staffMemberId", selectedStaffId);
        }

        const response = await fetch(`/api/availability?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          error?: string;
          slots?: AvailabilitySlot[];
        };

        if (!response.ok) {
          throw new Error(payload.error ?? t(locale, "public.bookingForm.unableAvailability"));
        }

        if (!isCancelled) {
          setSlots(payload.slots ?? []);
        }
      } catch (error) {
        if (!isCancelled) {
          setSlots([]);
          setAvailabilityError(
            error instanceof Error ? error.message : t(locale, "public.bookingForm.unableAvailability"),
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
    business.slug,
    locale,
    selectedDate,
    selectedServiceId,
    selectedStaffId,
  ]);

  function validateContactFields() {
    const nextFieldErrors: BookingFieldErrors = {};

    if (!customerName.trim()) {
      nextFieldErrors.customerName = t(locale, "validation.fullNameRequired");
    }

    if (!isValidEmailAddress(customerEmail)) {
      nextFieldErrors.customerEmail = t(locale, "validation.emailInvalid");
    }

    if (!isValidGenericPhoneNumber(customerPhone)) {
      nextFieldErrors.customerPhone = t(locale, "validation.phoneInvalid");
    }

    return nextFieldErrors;
  }

  function clearFieldError(field: keyof BookingFieldErrors) {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  async function submitBooking() {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        businessSlug: business.slug,
        serviceId: selectedServiceId,
        staffMemberId: selectedStaffId || undefined,
        date: selectedDate,
        slotStart: selectedSlot,
        locale,
        customerName,
        customerEmail,
        customerPhone,
        notes,
      }),
    });

    const payload = (await response.json()) as {
      appointmentId?: string;
      error?: string;
      fieldErrors?: BookingFieldErrors;
    };

    if (!response.ok) {
      setBookingError(payload.error ?? t(locale, "public.bookingForm.unableCreate"));
      setFieldErrors(payload.fieldErrors ?? {});

      if (response.status === 409) {
        setAvailabilityRefreshKey((currentValue) => currentValue + 1);
      }

      return;
    }

    router.push(
      buildPublicBusinessPath(business.slug, `/book/confirmation/${payload.appointmentId}`),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingError(null);

    if (!hasRequiredBookingFields) {
      setBookingError(t(locale, "public.bookingForm.completeRequiredFields"));
      return;
    }

    const nextFieldErrors = validateContactFields();
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setBookingError(t(locale, "public.bookingForm.reviewContactInformation"));
      return;
    }

    startTransition(() => {
      void submitBooking();
    });
  }

  function retryAvailability() {
    setAvailabilityError(null);
    setAvailabilityRefreshKey((currentValue) => currentValue + 1);
  }

  if (!hasStartedBooking) {
    return (
      <section
        aria-labelledby="booking-intro-heading"
        className="brand-panel-shadow rounded-[2rem] border border-border bg-card/95 p-6 sm:p-8"
      >
        <div className="grid gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            {t(locale, "public.bookingForm.introEyebrow")}
          </p>
          <h2 id="booking-intro-heading" className="font-display text-4xl">
            {t(locale, "public.bookingForm.introTitle")}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-muted">
            {t(locale, "public.bookingForm.introDescription")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setHasStartedBooking(true)}
          className="mt-6 w-full rounded-[1.5rem] border border-accent bg-surface p-5 text-left transition hover:bg-card focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <span className="block text-sm font-semibold uppercase tracking-[0.24em] text-muted">
            {t(locale, "public.bookingForm.startBookingLabel")}
          </span>
          <span className="mt-2 block font-display text-3xl">{business.name}</span>
          <span className="mt-2 block text-sm leading-7 text-muted">
            {t(locale, "public.bookingForm.liveAvailability")}
          </span>
        </button>
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <form
        noValidate
        onSubmit={handleSubmit}
        data-locale-section=""
        data-locale-section-order="2"
        className="brand-panel-shadow rounded-[2rem] border border-border bg-card/95 p-6 sm:p-8"
      >
        <section aria-labelledby="service-heading">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
              {t(locale, "public.bookingForm.stepOne")}
            </p>
            <h2 id="service-heading" className="font-display text-4xl">
              {t(locale, "public.bookingForm.serviceStepTitle")}
            </h2>
          </div>

          <div className="mt-5 grid gap-3">
            {services.map((service) => {
              const selected = selectedServiceId === service.id;

              return (
                <button
                  key={service.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedServiceId(service.id)}
                  className={`rounded-[1.25rem] border p-5 text-left transition ${
                    selected
                      ? "border-accent bg-highlight-surface text-highlight-foreground"
                      : "border-border bg-surface hover:border-accent"
                  }`}
                >
                  <span className="block text-lg font-semibold">{service.name}</span>
                  {service.description ? (
                    <span className="mt-2 block text-sm leading-6 opacity-80">
                      {service.description}
                    </span>
                  ) : null}
                  <span className="mt-3 flex flex-wrap gap-3 text-sm opacity-80">
                    <span>
                      {formatServiceTiming(
                        service.durationMinutes,
                        service.bufferMinutes,
                        locale,
                        service.prepMinutes,
                      )}
                    </span>
                    <span>{formatMoney(service.priceCents, locale)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="staff-heading" className="mt-8">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
              {t(locale, "public.bookingForm.stepTwo")}
            </p>
            <h2 id="staff-heading" className="font-display text-4xl">
              {t(locale, "public.bookingForm.staffStepTitle")}
            </h2>
            <p className="text-sm leading-7 text-muted">
              {t(locale, "public.bookingForm.staffStepDescription")}
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              aria-pressed={selectedStaffId === ""}
              onClick={() => setSelectedStaffId("")}
              className={`rounded-[1.25rem] border p-5 text-left transition ${
                selectedStaffId === ""
                  ? "border-accent bg-highlight-surface text-highlight-foreground"
                  : "border-border bg-surface hover:border-accent"
              }`}
            >
              <span className="block text-lg font-semibold">
                {t(locale, "public.bookingForm.anyStaff")}
              </span>
              <span className="mt-2 block text-sm leading-6 opacity-80">
                {t(locale, "public.bookingForm.anyStaffDescription")}
              </span>
            </button>

            {availableStaffMembers.map((staffMember) => {
              const selected = selectedStaffId === staffMember.id;

              return (
                <button
                  key={staffMember.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedStaffId(staffMember.id)}
                  className={`rounded-[1.25rem] border p-5 text-left transition ${
                    selected
                      ? "border-accent bg-highlight-surface text-highlight-foreground"
                      : "border-border bg-surface hover:border-accent"
                  }`}
                >
                  <span className="block text-lg font-semibold">{staffMember.name}</span>
                  <span className="mt-2 block text-sm leading-6 opacity-80">
                    {staffMember.title ?? t(locale, "public.bookingForm.availableProfessional")}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="time-heading" className="mt-8">
          <div className="grid gap-5">
            <label className="grid gap-2 text-sm font-medium">
              <span className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
                {t(locale, "public.bookingForm.stepThree")}
              </span>
              <span id="time-heading" className="font-display text-4xl">
                {t(locale, "public.bookingForm.timeStepTitle")}
              </span>
              <input
                type="date"
                min={format(new Date(), "yyyy-MM-dd")}
                className="mt-3 rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </label>

            <div aria-live="polite" className="min-h-9">
              {isLoadingSlots ? (
                <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
                  {t(locale, "public.bookingForm.searchingSlots")}
                </p>
              ) : null}
              {availabilityError ? (
                <div
                  role="alert"
                  className="flex flex-col gap-3 rounded-2xl bg-highlight-surface px-4 py-3 text-sm text-highlight-foreground sm:flex-row sm:items-center sm:justify-between"
                >
                  <p>{availabilityError}</p>
                  <button
                    type="button"
                    onClick={retryAvailability}
                    className="font-semibold underline underline-offset-4"
                  >
                    {t(locale, "public.bookingForm.retry")}
                  </button>
                </div>
              ) : null}
              {!availabilityError && !isLoadingSlots && slots.length === 0 ? (
                <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
                  {t(locale, "public.bookingForm.noSlotsForSelection")}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot.startAt}
                  type="button"
                  aria-pressed={selectedSlot === slot.startAt}
                  onClick={() => setSelectedSlot(slot.startAt)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    selectedSlot === slot.startAt
                      ? "brand-accent-fill border-accent"
                      : "border-border bg-surface hover:border-accent"
                  }`}
                >
                  {formatSlotTime(slot.startAt, locale)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="contact-heading" className="mt-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
              {t(locale, "public.bookingForm.stepFour")}
            </p>
            <h2 id="contact-heading" className="mt-2 font-display text-4xl">
              {t(locale, "public.bookingForm.contactStepTitle")}
            </h2>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              {t(locale, "public.bookingForm.fullName")}
              <input
                required
                autoComplete="name"
                aria-invalid={Boolean(fieldErrors.customerName)}
                value={customerName}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  clearFieldError("customerName");
                }}
                className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
              />
              {fieldErrors.customerName ? (
                <p className="text-sm text-highlight-foreground">{fieldErrors.customerName}</p>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-medium">
              {t(locale, "common.email")}
              <input
                required
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.customerEmail)}
                value={customerEmail}
                onChange={(event) => {
                  setCustomerEmail(event.target.value);
                  clearFieldError("customerEmail");
                }}
                className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
              />
              {fieldErrors.customerEmail ? (
                <p className="text-sm text-highlight-foreground">{fieldErrors.customerEmail}</p>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-medium">
              {t(locale, "common.phone")}
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={Boolean(fieldErrors.customerPhone)}
                value={customerPhone}
                onChange={(event) => {
                  setCustomerPhone(event.target.value);
                  clearFieldError("customerPhone");
                }}
                className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
              />
              {fieldErrors.customerPhone ? (
                <p className="text-sm text-highlight-foreground">{fieldErrors.customerPhone}</p>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-medium">
              {t(locale, "common.notes")}
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
              />
            </label>
          </div>
        </section>

        {bookingError ? (
          <p
            role="alert"
            className="mt-6 rounded-2xl bg-highlight-surface px-4 py-3 text-sm text-highlight-foreground"
          >
            {bookingError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={confirmDisabled}
          className="brand-accent-fill localized-action mt-8 rounded-full px-6 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? t(locale, "public.bookingForm.confirming")
            : t(locale, "public.bookingForm.confirmBooking")}
        </button>
      </form>

      <aside
        data-locale-section=""
        data-locale-section-order="3"
        className="rounded-[2rem] border border-border bg-surface/90 p-8 lg:sticky lg:top-6 lg:self-start"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {t(locale, "public.bookingForm.bookingSummary")}
        </p>

        <div className="mt-5 rounded-[1.5rem] bg-card p-6">
          <h2 className="font-display text-3xl">
            {selectedService?.name ?? t(locale, "public.bookingForm.selectService")}
          </h2>
          {selectedService?.description ? (
            <p className="mt-3 text-sm leading-7 text-muted">{selectedService.description}</p>
          ) : null}

          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">{t(locale, "common.business")}</dt>
              <dd className="text-right font-medium">{business.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">{t(locale, "common.professional")}</dt>
              <dd className="text-right font-medium">
                {selectedStaff?.name ??
                  selectedSlotDetails?.staffMemberName ??
                  t(locale, "public.bookingForm.anyStaff")}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">{t(locale, "common.date")}</dt>
              <dd className="text-right font-medium">{selectedDate}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">{t(locale, "common.slot")}</dt>
              <dd className="text-right font-medium">
                {selectedSlotLabel ?? t(locale, "public.bookingForm.notSelected")}
              </dd>
            </div>
            {selectedService ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">{t(locale, "common.timing")}</dt>
                  <dd className="text-right font-medium">
                    {formatServiceTiming(
                      selectedService.durationMinutes,
                      selectedService.bufferMinutes,
                      locale,
                      selectedService.prepMinutes,
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">{t(locale, "common.price")}</dt>
                  <dd className="text-right font-semibold">
                    {formatMoney(selectedService.priceCents, locale)}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
        </div>
      </aside>
    </div>
  );
}
