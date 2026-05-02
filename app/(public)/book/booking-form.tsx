"use client";

import { addDays, format } from "date-fns";
import { getProviders, signIn, signOut, useSession, type ClientSafeProvider } from "next-auth/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { isValidGenericPhoneNumber } from "@/lib/contact";
import { formatMoney, formatServiceTiming } from "@/lib/format";
import { t, type AppLocale } from "@/lib/i18n";

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
  locale: AppLocale;
};

type ContactField = "customerName" | "customerEmail" | "customerPhone";
type BookingFieldErrors = Partial<Record<ContactField, string>>;

type SavedBookingState = {
  selectedServiceId?: string;
  selectedStaffId?: string;
  selectedDate?: string;
  selectedSlot?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
};

const BOOKING_STATE_STORAGE_KEY = "appointment-public-booking-state";

function getInitialBookingDate() {
  const date = addDays(new Date(), 1);

  while (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }

  return format(date, "yyyy-MM-dd");
}

function isValidDateInput(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function readSavedBookingState() {
  try {
    const rawState = window.sessionStorage.getItem(BOOKING_STATE_STORAGE_KEY);

    if (!rawState) {
      return null;
    }

    return JSON.parse(rawState) as SavedBookingState;
  } catch {
    return null;
  }
}

export default function BookingForm({
  business,
  services,
  staffMembers,
  locale,
}: BookingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [authProviders, setAuthProviders] = useState<Record<string, ClientSafeProvider> | null>(
    null,
  );
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
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);
  const [hasRestoredBookingState, setHasRestoredBookingState] = useState(false);
  const preservedSlotRef = useRef<string | null>(null);
  const contactFieldsRef = useRef<HTMLDivElement | null>(null);

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const selectedStaff = staffMembers.find((staffMember) => staffMember.id === selectedStaffId);
  const isSignedIn = sessionStatus === "authenticated";
  const signedInLabel = session?.user?.name ?? session?.user?.email ?? null;
  const authError = searchParams.get("error");
  const googleAvailable = Boolean(authProviders?.google);
  const appleAvailable = Boolean(authProviders?.apple);
  const authProvidersLoaded = authProviders !== null;
  const hasAnyAuthProvider = googleAvailable || appleAvailable;

  useEffect(() => {
    const savedState = readSavedBookingState();

    if (savedState) {
      const savedServiceId = services.some((service) => service.id === savedState.selectedServiceId)
        ? savedState.selectedServiceId
        : services[0]?.id;
      const savedStaffId = staffMembers.some((staffMember) => staffMember.id === savedState.selectedStaffId)
        ? savedState.selectedStaffId
        : staffMembers[0]?.id;

      setSelectedServiceId(savedServiceId ?? "");
      setSelectedStaffId(savedStaffId ?? "");
      const savedDate = savedState.selectedDate;

      setSelectedDate(isValidDateInput(savedDate) ? savedDate : getInitialBookingDate());
      setCustomerName(savedState.customerName ?? "");
      setCustomerEmail(savedState.customerEmail ?? "");
      setCustomerPhone(savedState.customerPhone ?? "");
      setNotes(savedState.notes ?? "");

      if (savedState.selectedSlot) {
        preservedSlotRef.current = savedState.selectedSlot;
        setSelectedSlot(savedState.selectedSlot);
      }
    }

    setHasRestoredBookingState(true);
  }, [services, staffMembers]);

  useEffect(() => {
    if (!hasRestoredBookingState) {
      return;
    }

    const requestedSlug = searchParams.get("service");

    if (!requestedSlug) {
      return;
    }

    const matchingService = services.find((service) => service.slug === requestedSlug);

    if (matchingService && matchingService.id !== selectedServiceId) {
      setSelectedServiceId(matchingService.id);
    }
  }, [hasRestoredBookingState, searchParams, selectedServiceId, services]);

  useEffect(() => {
    if (!hasRestoredBookingState) {
      return;
    }

    const stateToSave: SavedBookingState = {
      selectedServiceId,
      selectedStaffId,
      selectedDate,
      selectedSlot,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    };

    window.sessionStorage.setItem(BOOKING_STATE_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [
    customerEmail,
    customerName,
    customerPhone,
    hasRestoredBookingState,
    notes,
    selectedDate,
    selectedServiceId,
    selectedSlot,
    selectedStaffId,
  ]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAuthProviders() {
      const providers = await getProviders();

      if (!isCancelled) {
        setAuthProviders((providers ?? {}) as Record<string, ClientSafeProvider>);
      }
    }

    void loadAuthProviders();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      return;
    }

    const profileName = session.user?.name?.trim();
    const profileEmail = session.user?.email?.trim();

    if (profileName) {
      setCustomerName((currentValue) => currentValue.trim() || profileName);
    }

    if (profileEmail) {
      setCustomerEmail((currentValue) => currentValue.trim() || profileEmail);
    }
  }, [sessionStatus, session?.user?.email, session?.user?.name]);

  useEffect(() => {
    const restoredSlot = preservedSlotRef.current;

    if (restoredSlot) {
      preservedSlotRef.current = null;
    } else {
      setSelectedSlot("");
    }

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
          locale,
        });

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
          const nextSlots = payload.slots ?? [];

          setSlots(nextSlots);
          setSelectedSlot((currentSlot) =>
            currentSlot && nextSlots.some((slot) => slot.startAt === currentSlot)
              ? currentSlot
              : "",
          );
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
    business.id,
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

  function clearFieldError(field: ContactField) {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function persistCurrentBookingState() {
    const stateToSave: SavedBookingState = {
      selectedServiceId,
      selectedStaffId,
      selectedDate,
      selectedSlot,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    };

    window.sessionStorage.setItem(BOOKING_STATE_STORAGE_KEY, JSON.stringify(stateToSave));
  }

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

    window.sessionStorage.removeItem(BOOKING_STATE_STORAGE_KEY);
    router.push(`/book/confirmation/${payload.appointmentId}`);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingError(null);

    if (!selectedSlot) {
      setBookingError(t(locale, "public.bookingForm.chooseSlot"));
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

  function handleContinueAsGuest() {
    persistCurrentBookingState();
    contactFieldsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleSignIn(provider: "google" | "apple") {
    persistCurrentBookingState();
    void signIn(provider, {
      callbackUrl: "/book?auth=customer",
    });
  }

  function handleSignOut() {
    persistCurrentBookingState();
    void signOut({
      callbackUrl: "/book?auth=guest",
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <form
        noValidate
        onSubmit={handleSubmit}
        data-locale-section=""
        data-locale-section-order="2"
        className="brand-panel-shadow rounded-[2rem] border border-border bg-card/95 p-8"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "common.service")}
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
            {t(locale, "common.staffMember")}
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
            {t(locale, "common.date")}
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
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-3xl">
              {t(locale, "public.bookingForm.availableSlots")}
            </h2>
            {isLoadingSlots ? (
              <p className="text-sm text-muted">{t(locale, "public.bookingForm.checking")}</p>
            ) : null}
          </div>

          {availabilityError ? (
            <p className="mt-4 rounded-2xl bg-highlight-surface px-4 py-3 text-sm text-highlight-foreground">
              {availabilityError}
            </p>
          ) : null}

          {!availabilityError && !isLoadingSlots && slots.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
              {t(locale, "public.bookingForm.noSlots")}
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

        <section className="mt-8 rounded-[1.5rem] border border-border bg-surface/80 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold">
                {t(locale, "public.bookingForm.signInOptional")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {t(locale, "public.bookingForm.signInOptionalDescription")}
              </p>
            </div>

            {isSignedIn ? (
              <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                <p className="font-semibold">
                  {t(locale, "public.bookingForm.signedInAs", {
                    value: signedInLabel ?? t(locale, "common.customer"),
                  })}
                </p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-2 text-sm font-semibold text-muted transition hover:text-foreground"
                >
                  {t(locale, "public.bookingForm.signOut")}
                </button>
              </div>
            ) : null}
          </div>

          {authError ? (
            <p className="mt-4 rounded-2xl bg-highlight-surface px-4 py-3 text-sm text-highlight-foreground">
              {t(locale, "public.bookingForm.signInError")}
            </p>
          ) : null}

          {!isSignedIn ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  className="min-h-14 rounded-2xl border border-accent bg-card px-4 py-3 text-sm font-semibold transition hover:bg-surface"
                >
                  {t(locale, "public.bookingForm.continueAsGuest")}
                </button>
                <button
                  type="button"
                  disabled={!authProvidersLoaded || !googleAvailable}
                  onClick={() => handleSignIn("google")}
                  className="min-h-14 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {t(locale, "public.bookingForm.signInWithGoogle")}
                </button>
                <button
                  type="button"
                  disabled={!authProvidersLoaded || !appleAvailable}
                  onClick={() => handleSignIn("apple")}
                  className="min-h-14 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {t(locale, "public.bookingForm.signInWithApple")}
                </button>
              </div>

              {authProvidersLoaded && !hasAnyAuthProvider ? (
                <p className="mt-3 text-sm leading-6 text-muted">
                  {t(locale, "public.bookingForm.signInNotConfigured")}
                </p>
              ) : null}
            </>
          ) : null}
        </section>

        <div ref={contactFieldsRef} className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="font-display text-3xl">
              {t(locale, "public.bookingForm.contactInformation")}
            </h2>
            <p id="contact-information-help" className="mt-2 text-sm leading-6 text-muted">
              {t(locale, "public.bookingForm.contactInformationHelp")}
            </p>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "public.bookingForm.fullName")}
            <input
              required
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.customerName)}
              aria-describedby={fieldErrors.customerName ? "customer-name-error" : undefined}
              value={customerName}
              onChange={(event) => {
                setCustomerName(event.target.value);
                clearFieldError("customerName");
              }}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
            {fieldErrors.customerName ? (
              <p id="customer-name-error" className="text-sm text-highlight-foreground">
                {fieldErrors.customerName}
              </p>
            ) : null}
          </label>

          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "common.email")}
            <input
              required
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.customerEmail)}
              aria-describedby={fieldErrors.customerEmail ? "customer-email-error" : undefined}
              value={customerEmail}
              onChange={(event) => {
                setCustomerEmail(event.target.value);
                clearFieldError("customerEmail");
              }}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
            {fieldErrors.customerEmail ? (
              <p id="customer-email-error" className="text-sm text-highlight-foreground">
                {fieldErrors.customerEmail}
              </p>
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
              aria-describedby={fieldErrors.customerPhone ? "customer-phone-error" : "contact-information-help"}
              value={customerPhone}
              onChange={(event) => {
                setCustomerPhone(event.target.value);
                clearFieldError("customerPhone");
              }}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
            {fieldErrors.customerPhone ? (
              <p id="customer-phone-error" className="text-sm text-highlight-foreground">
                {fieldErrors.customerPhone}
              </p>
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

        {bookingError ? (
          <p className="mt-6 rounded-2xl bg-highlight-surface px-4 py-3 text-sm text-highlight-foreground">
            {bookingError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="brand-accent-fill localized-action mt-8 rounded-full px-6 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting
            ? t(locale, "public.bookingForm.confirming")
            : t(locale, "public.bookingForm.confirmBooking")}
        </button>
      </form>

      <aside
        data-locale-section=""
        data-locale-section-order="3"
        className="rounded-[2rem] border border-border bg-surface/90 p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {t(locale, "public.bookingForm.bookingSummary")}
        </p>

        {selectedService ? (
          <div className="mt-5 rounded-[1.5rem] bg-card p-6">
            <h2 className="font-display text-3xl">{selectedService.name}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{selectedService.description}</p>
            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">{t(locale, "common.timing")}</dt>
                <dd>
                  {formatServiceTiming(
                    selectedService.durationMinutes,
                    selectedService.bufferMinutes,
                    locale,
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">{t(locale, "common.price")}</dt>
                <dd className="font-semibold">{formatMoney(selectedService.priceCents, locale)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">{t(locale, "common.staff")}</dt>
                <dd>{selectedStaff?.name ?? t(locale, "public.bookingForm.selectStaff")}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">{t(locale, "common.date")}</dt>
                <dd>{selectedDate}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">{t(locale, "common.slot")}</dt>
                <dd>
                  {slots.find((slot) => slot.startAt === selectedSlot)?.label ??
                    t(locale, "public.bookingForm.notSelected")}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="mt-5 rounded-[1.5rem] bg-card p-6 text-sm leading-7 text-muted">
          <p>{t(locale, "public.bookingForm.mvpNote", { businessName: business.name })}</p>
          <p className="mt-3">
            {t(locale, "public.bookingForm.serverNote")}
          </p>
        </div>
      </aside>
    </div>
  );
}
