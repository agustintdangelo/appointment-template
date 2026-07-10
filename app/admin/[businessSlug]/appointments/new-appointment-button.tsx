"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { createManualAppointmentAction } from "@/app/admin/actions";
import { initialAdminEntityActionState } from "@/app/admin/components/admin-collection-types";
import CreateEntityModal from "@/app/admin/components/create-entity-modal";
import { isValidGenericPhoneNumber } from "@/lib/contact";
import { t, type AppLocale } from "@/lib/i18n";

type ServiceOption = {
  id: string;
  name: string;
  staffLinks?: Array<{ staffMemberId: string }>;
};

type StaffOption = {
  id: string;
  name: string;
};

type AvailabilitySlot = {
  startAt: string;
  endAt: string;
  label: string;
  assignedStaffMemberId: string;
  staffMemberName: string;
};

type NewAppointmentButtonProps = {
  businessSlug: string;
  services: ServiceOption[];
  staffMembers: StaffOption[];
  locale: AppLocale;
};

type ContactFieldErrors = Partial<
  Record<"customerName" | "customerEmail" | "customerPhone", string>
>;

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function formatSlotTime(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getTodayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function SubmitButton({ disabled, locale }: { disabled: boolean; locale: AppLocale }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? t(locale, "common.creating")
        : t(locale, "admin.appointments.createSubmit")}
    </button>
  );
}

function NewAppointmentForm({
  businessSlug,
  services,
  staffMembers,
  locale,
  onClose,
}: {
  businessSlug: string;
  services: ServiceOption[];
  staffMembers: StaffOption[];
  locale: AppLocale;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saveState, saveAction] = useActionState(
    createManualAppointmentAction,
    initialAdminEntityActionState,
  );
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateInputValue());
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const capableStaffIds = selectedService
    ? new Set(selectedService.staffLinks?.map((link) => link.staffMemberId) ?? [])
    : null;
  const capableStaffMembers = capableStaffIds
    ? staffMembers.filter((staffMember) => capableStaffIds.has(staffMember.id))
    : staffMembers;

  useEffect(() => {
    if (saveState.status === "success") {
      onClose();
      router.refresh();
    }

    if (saveState.status === "error") {
      setAvailabilityRefreshKey((currentValue) => currentValue + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState.status]);

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
          businessSlug,
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
          throw new Error(payload.error ?? t(locale, "validation.unableAvailability"));
        }

        if (!isCancelled) {
          setSlots(payload.slots ?? []);
        }
      } catch (error) {
        if (!isCancelled) {
          setSlots([]);
          setAvailabilityError(
            error instanceof Error ? error.message : t(locale, "validation.unableAvailability"),
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
  }, [availabilityRefreshKey, businessSlug, locale, selectedDate, selectedServiceId, selectedStaffId]);

  function clearFieldError(field: keyof ContactFieldErrors) {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function validateContactFields() {
    const nextFieldErrors: ContactFieldErrors = {};

    if (!customerName.trim()) {
      nextFieldErrors.customerName = t(locale, "validation.fullNameRequired");
    }

    if (!isValidEmailAddress(customerEmail)) {
      nextFieldErrors.customerEmail = t(locale, "validation.emailInvalid");
    }

    if (customerPhone.trim() && !isValidGenericPhoneNumber(customerPhone)) {
      nextFieldErrors.customerPhone = t(locale, "validation.phoneInvalid");
    }

    return nextFieldErrors;
  }

  const hasRequiredFields =
    Boolean(selectedServiceId) && Boolean(selectedDate) && Boolean(selectedSlot);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const nextFieldErrors = validateContactFields();
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      event.preventDefault();
    }
  }

  return (
    <form action={saveAction} onSubmit={handleSubmit} className="grid gap-5">
      <input type="hidden" name="businessSlug" value={businessSlug} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="date" value={selectedDate} />
      <input type="hidden" name="slotStart" value={selectedSlot} />

      {saveState.status === "error" && saveState.message ? (
        <div className="admin-error-banner">{saveState.message}</div>
      ) : null}

      <label className="grid gap-2 text-sm font-medium">
        {t(locale, "admin.appointments.serviceLabel")}
        <select
          name="serviceId"
          required
          value={selectedServiceId}
          onChange={(event) => setSelectedServiceId(event.target.value)}
          className="admin-input"
        >
          <option value="" disabled>
            {t(locale, "admin.appointments.servicePlaceholder")}
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-medium">
        {t(locale, "admin.appointments.createStaffLabel")}
        <select
          name="staffMemberId"
          value={selectedStaffId}
          onChange={(event) => setSelectedStaffId(event.target.value)}
          className="admin-input"
        >
          <option value="">{t(locale, "admin.appointments.anyStaffOption")}</option>
          {capableStaffMembers.map((staffMember) => (
            <option key={staffMember.id} value={staffMember.id}>
              {staffMember.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-medium">
        {t(locale, "admin.appointments.dateLabel")}
        <input
          type="date"
          required
          min={getTodayDateInputValue()}
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="admin-input"
        />
      </label>

      <div className="grid gap-2">
        <p className="text-sm font-medium">{t(locale, "admin.appointments.slotLabel")}</p>
        <div aria-live="polite" className="min-h-9">
          {isLoadingSlots ? (
            <p className="text-sm text-muted">{t(locale, "admin.appointments.loadingSlots")}</p>
          ) : null}
          {availabilityError ? (
            <p role="alert" className="text-sm text-rose-700">
              {availabilityError}
            </p>
          ) : null}
          {!availabilityError && !isLoadingSlots && selectedServiceId && slots.length === 0 ? (
            <p className="text-sm text-muted">{t(locale, "admin.appointments.noSlots")}</p>
          ) : null}
        </div>

        {slots.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={slot.startAt}
                type="button"
                aria-pressed={selectedSlot === slot.startAt}
                onClick={() => setSelectedSlot(slot.startAt)}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  selectedSlot === slot.startAt
                    ? "border-accent bg-highlight-surface text-highlight-foreground"
                    : "border-border bg-surface hover:border-accent"
                }`}
              >
                {formatSlotTime(slot.startAt, locale)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          {t(locale, "admin.appointments.customerNameLabel")}
          <input
            name="customerName"
            required
            autoComplete="name"
            value={customerName}
            onChange={(event) => {
              setCustomerName(event.target.value);
              clearFieldError("customerName");
            }}
            className="admin-input"
          />
          {fieldErrors.customerName ? (
            <p className="text-sm text-rose-700">{fieldErrors.customerName}</p>
          ) : null}
        </label>

        <label className="grid gap-2 text-sm font-medium">
          {t(locale, "common.email")}
          <input
            name="customerEmail"
            type="email"
            required
            autoComplete="email"
            value={customerEmail}
            onChange={(event) => {
              setCustomerEmail(event.target.value);
              clearFieldError("customerEmail");
            }}
            className="admin-input"
          />
          {fieldErrors.customerEmail ? (
            <p className="text-sm text-rose-700">{fieldErrors.customerEmail}</p>
          ) : null}
        </label>

        <label className="grid gap-2 text-sm font-medium">
          {t(locale, "common.phone")}
          <input
            name="customerPhone"
            type="tel"
            autoComplete="tel"
            value={customerPhone}
            onChange={(event) => {
              setCustomerPhone(event.target.value);
              clearFieldError("customerPhone");
            }}
            className="admin-input"
          />
          {fieldErrors.customerPhone ? (
            <p className="text-sm text-rose-700">{fieldErrors.customerPhone}</p>
          ) : null}
        </label>

        <label className="grid gap-2 text-sm font-medium">
          {t(locale, "common.notes")}
          <input
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="admin-input"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <SubmitButton disabled={!hasRequiredFields} locale={locale} />
        <button type="button" onClick={onClose} className="admin-button-secondary">
          {t(locale, "common.cancel")}
        </button>
      </div>
    </form>
  );
}

export default function NewAppointmentButton({
  businessSlug,
  services,
  staffMembers,
  locale,
}: NewAppointmentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="admin-button-primary">
        {t(locale, "admin.appointments.createButton")}
      </button>

      <CreateEntityModal
        eyebrow={t(locale, "admin.appointments.createEyebrow")}
        title={t(locale, "admin.appointments.createTitle")}
        description={t(locale, "admin.appointments.createDescription")}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        closeLabel={t(locale, "common.close")}
        closeAriaLabel={t(locale, "common.closeDialog")}
      >
        {services.length === 0 ? (
          <p className="text-sm text-muted">{t(locale, "admin.appointments.noBookableServices")}</p>
        ) : (
          <NewAppointmentForm
            businessSlug={businessSlug}
            services={services}
            staffMembers={staffMembers}
            locale={locale}
            onClose={() => setIsOpen(false)}
          />
        )}
      </CreateEntityModal>
    </>
  );
}
