"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import {
  deleteServiceAction,
  upsertServiceAction,
} from "@/app/admin/actions";
import AdminListHeader from "@/app/admin/components/admin-list-header";
import CardGrid from "@/app/admin/components/card-grid";
import CollectionViewTransition from "@/app/admin/components/collection-view-transition";
import {
  initialAdminEntityActionState,
  type AdminCollectionSort,
  type AdminCollectionStatusFilter,
} from "@/app/admin/components/admin-collection-types";
import CreateEntityModal from "@/app/admin/components/create-entity-modal";
import ListView from "@/app/admin/components/list-view";
import useSessionCollectionViewMode from "@/app/admin/components/use-session-collection-view";
import { formatMoney, formatServiceTiming } from "@/lib/format";
import { t, type AppLocale } from "@/lib/i18n";

type ServiceRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  bufferMinutes: number;
  priceCents: number;
  isActive: boolean;
  sortOrder: number;
  _count?: {
    appointments: number;
  };
};

type ServicesManagerProps = {
  services: ServiceRecord[];
  locale: AppLocale;
};

const VIEW_MODE_STORAGE_KEY = "appointment-admin-services-view-mode";

function matchesServiceQuery(service: ServiceRecord, query: string) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();

  return [service.name, service.slug, service.description ?? ""].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

function matchesStatusFilter(service: ServiceRecord, filter: AdminCollectionStatusFilter) {
  if (filter === "active") {
    return service.isActive;
  }

  if (filter === "inactive") {
    return !service.isActive;
  }

  return true;
}

function sortServices(services: ServiceRecord[], sortValue: AdminCollectionSort) {
  const nextServices = [...services];

  if (sortValue === "name-asc") {
    nextServices.sort((left, right) => left.name.localeCompare(right.name));
    return nextServices;
  }

  if (sortValue === "name-desc") {
    nextServices.sort((left, right) => right.name.localeCompare(left.name));
    return nextServices;
  }

  return nextServices;
}

function FormErrorText({ error }: { error?: string }) {
  if (!error) {
    return null;
  }

  return <p className="text-sm text-rose-700">{error}</p>;
}

function EditIconButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="admin-icon-button"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-4.5 w-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 16.5h3.2l8.6-8.6-3.2-3.2-8.6 8.6z" />
        <path d="m11.9 4.7 3.2 3.2" />
        <path d="M3.5 16.5h12.8" />
      </svg>
    </button>
  );
}

function SaveServiceButton({
  isEditing,
  locale,
}: {
  isEditing: boolean;
  locale: AppLocale;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? isEditing
          ? t(locale, "common.saving")
          : t(locale, "common.creating")
        : isEditing
          ? t(locale, "admin.services.save")
          : t(locale, "admin.services.create")}
    </button>
  );
}

function DeleteServiceButton({
  disabled,
  locale,
}: {
  disabled: boolean;
  locale: AppLocale;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? t(locale, "common.deleting") : t(locale, "admin.services.delete")}
    </button>
  );
}

function ServiceModalForm({
  service,
  onClose,
  locale,
}: {
  service: ServiceRecord | null;
  onClose: () => void;
  locale: AppLocale;
}) {
  const router = useRouter();
  const [saveState, saveAction] = useActionState(upsertServiceAction, initialAdminEntityActionState);
  const [deleteState, deleteAction] = useActionState(
    deleteServiceAction,
    initialAdminEntityActionState,
  );
  const canDelete = !!service && (service._count?.appointments ?? 0) === 0;

  useEffect(() => {
    if (saveState.status === "success" || deleteState.status === "success") {
      onClose();
      router.refresh();
    }
  }, [deleteState.status, onClose, router, saveState.status]);

  return (
    <div className="grid gap-6">
      <form action={saveAction} className="grid gap-5">
        <input type="hidden" name="serviceId" defaultValue={service?.id ?? ""} />
        <input type="hidden" name="locale" value={locale} />

        {saveState.status === "error" && saveState.message ? (
          <div className="admin-error-banner">
            {saveState.message}
          </div>
        ) : null}

        <label className="grid gap-2 text-sm font-medium">
          {t(locale, "admin.services.name")}
          <input
            name="name"
            required
            autoFocus
            defaultValue={service?.name ?? ""}
            className="admin-input"
          />
          <FormErrorText error={saveState.fieldErrors.name} />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          {t(locale, "admin.services.slug")}
          <input
            name="slug"
            defaultValue={service?.slug ?? ""}
            className="admin-input"
          />
          <FormErrorText error={saveState.fieldErrors.slug} />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          {t(locale, "admin.services.descriptionField")}
          <textarea
            name="description"
            rows={5}
            defaultValue={service?.description ?? ""}
            className="admin-textarea"
          />
          <FormErrorText error={saveState.fieldErrors.description} />
        </label>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "admin.services.duration")}
            <input
              name="durationMinutes"
              type="number"
              min="5"
              step="5"
              required
              defaultValue={service?.durationMinutes ?? 45}
              className="admin-input"
            />
            <FormErrorText error={saveState.fieldErrors.durationMinutes} />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "admin.services.buffer")}
            <input
              name="bufferMinutes"
              type="number"
              min="0"
              step="5"
              required
              defaultValue={service?.bufferMinutes ?? 0}
              className="admin-input"
            />
            <FormErrorText error={saveState.fieldErrors.bufferMinutes} />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "common.price")}
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={service ? (service.priceCents / 100).toFixed(2) : "0.00"}
              className="admin-input"
            />
            <FormErrorText error={saveState.fieldErrors.price} />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "admin.services.sortOrder")}
            <input
              name="sortOrder"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={service?.sortOrder ?? 0}
              className="admin-input"
            />
            <FormErrorText error={saveState.fieldErrors.sortOrder} />
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={service ? service.isActive : true}
            className="admin-checkbox"
          />
          {t(locale, "admin.services.activeBookable")}
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <SaveServiceButton isEditing={!!service} locale={locale} />
          <button
            type="button"
            onClick={onClose}
            className="admin-button-secondary"
          >
            {t(locale, "common.cancel")}
          </button>
        </div>
      </form>

      {service ? (
        <div className="admin-muted-panel px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
                {t(locale, "admin.services.danger")}
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                {t(locale, "admin.services.dangerDescription")}
              </p>
            </div>

            <form action={deleteAction}>
              <input type="hidden" name="serviceId" defaultValue={service.id} />
              <input type="hidden" name="locale" value={locale} />
              <DeleteServiceButton disabled={!canDelete} locale={locale} />
            </form>
          </div>

          {deleteState.status === "error" && deleteState.message ? (
            <p className="mt-3 text-sm text-rose-700">{deleteState.message}</p>
          ) : null}

          {!canDelete ? (
            <p className="mt-3 text-sm text-muted">
              {t(locale, "admin.services.cannotDelete")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AddServiceCard({ onCreate, locale }: { onCreate: () => void; locale: AppLocale }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="admin-card-dashed group flex min-h-[20rem] flex-col items-start justify-between p-6 text-left transition hover:border-slate-400 hover:bg-slate-50"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-slate-50 text-muted transition group-hover:border-slate-400 group-hover:text-slate-900">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 4v12" />
          <path d="M4 10h12" />
        </svg>
      </div>

      <div>
        <p className="text-xl font-semibold text-slate-900">
          {t(locale, "admin.services.add")}
        </p>
        <p className="mt-3 max-w-sm text-sm leading-7 text-muted">
          {t(locale, "admin.services.addDescription")}
        </p>
      </div>
    </button>
  );
}

function ServiceCard({
  service,
  onEdit,
  locale,
}: {
  service: ServiceRecord;
  onEdit: (service: ServiceRecord) => void;
  locale: AppLocale;
}) {
  return (
    <article className="admin-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold text-slate-900">{service.name}</p>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted">
            {service.slug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-surface px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
            {service.isActive ? t(locale, "common.active") : t(locale, "common.inactive")}
          </span>
          <EditIconButton
            label={t(locale, "admin.services.editLabel", { name: service.name })}
            onClick={() => onEdit(service)}
          />
        </div>
      </div>

      <p className="mt-4 min-h-[4.5rem] line-clamp-3 text-sm leading-7 text-muted">
        {service.description ?? t(locale, "common.noDescription")}
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {formatServiceTiming(service.durationMinutes, service.bufferMinutes, locale)}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {formatMoney(service.priceCents, locale)}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {t(locale, "common.appointments")}: {service._count?.appointments ?? 0}
        </span>
      </div>
    </article>
  );
}

function AddServiceListRow({ onCreate, locale }: { onCreate: () => void; locale: AppLocale }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="flex w-full flex-col gap-3 px-5 py-5 text-left transition hover:bg-slate-50"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-border bg-surface text-muted">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-4.5 w-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 4v12" />
            <path d="M4 10h12" />
          </svg>
        </span>
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {t(locale, "admin.services.add")}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "admin.services.addListDescription")}
          </p>
        </div>
      </div>
    </button>
  );
}

function ServiceListRow({
  service,
  onEdit,
  locale,
}: {
  service: ServiceRecord;
  onEdit: (service: ServiceRecord) => void;
  locale: AppLocale;
}) {
  return (
    <article className="flex flex-col gap-4 px-5 py-5 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto] md:items-center md:gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-lg font-semibold text-slate-900">{service.name}</p>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
            {service.isActive ? t(locale, "common.active") : t(locale, "common.inactive")}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{service.description ?? service.slug}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {formatServiceTiming(service.durationMinutes, service.bufferMinutes, locale)}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {formatMoney(service.priceCents, locale)}
        </span>
      </div>

      <div className="flex justify-start md:justify-end">
        <EditIconButton
          label={t(locale, "admin.services.editLabel", { name: service.name })}
          onClick={() => onEdit(service)}
        />
      </div>
    </article>
  );
}

function EmptyResults({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="admin-card-dashed px-6 py-10 text-center">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
      <button
        type="button"
        onClick={onAction}
        className="admin-button-secondary mt-5"
      >
        {actionLabel}
      </button>
    </div>
  );
}

export default function ServicesManager({ services, locale }: ServicesManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminCollectionStatusFilter>("all");
  const [sortValue, setSortValue] = useState<AdminCollectionSort>("default");
  const [viewMode, setViewMode] = useSessionCollectionViewMode(VIEW_MODE_STORAGE_KEY);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const visibleServices = sortServices(
    services.filter(
      (service) =>
        matchesServiceQuery(service, searchQuery.trim()) &&
        matchesStatusFilter(service, statusFilter),
    ),
    sortValue,
  );
  const hasFilters =
    searchQuery.trim().length > 0 || statusFilter !== "all" || sortValue !== "default";
  const isModalOpen = isCreateModalOpen || editingService !== null;
  const modalService = isCreateModalOpen ? null : editingService;

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setSortValue("default");
  }

  function closeModal() {
    setEditingService(null);
    setIsCreateModalOpen(false);
  }

  return (
    <>
      <AdminListHeader
        searchLabel={t(locale, "admin.services.searchLabel")}
        searchPlaceholder={t(locale, "admin.services.searchPlaceholder")}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortValue={sortValue}
        onSortChange={setSortValue}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        locale={locale}
        summary={
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {t(locale, "admin.services.showing", {
                visible: visibleServices.length,
                total: services.length,
              })}
            </span>
            {hasFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="admin-link"
              >
                {t(locale, "common.clearFilters")}
              </button>
            ) : null}
          </div>
        }
      />

      {visibleServices.length === 0 && hasFilters ? (
        <EmptyResults
          title={t(locale, "admin.services.noMatchesTitle")}
          description={t(locale, "admin.services.noMatchesDescription")}
          actionLabel={t(locale, "common.resetFilters")}
          onAction={resetFilters}
        />
      ) : (
        <CollectionViewTransition
          viewMode={viewMode}
          transitionKey={`${viewMode}:${sortValue}`}
          cards={
            <CardGrid>
              <AddServiceCard
                key="create-service"
                onCreate={() => setIsCreateModalOpen(true)}
                locale={locale}
              />
              {visibleServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onEdit={(selectedService) => setEditingService(selectedService)}
                  locale={locale}
                />
              ))}
            </CardGrid>
          }
          list={
            <ListView>
              <AddServiceListRow
                key="create-service-row"
                onCreate={() => setIsCreateModalOpen(true)}
                locale={locale}
              />
              {visibleServices.map((service) => (
                <div key={service.id} className="border-t border-border">
                  <ServiceListRow
                    service={service}
                    onEdit={(selectedService) => setEditingService(selectedService)}
                    locale={locale}
                  />
                </div>
              ))}
            </ListView>
          }
        />
      )}

      <CreateEntityModal
        eyebrow={
          modalService
            ? t(locale, "admin.services.editEyebrow")
            : t(locale, "admin.services.createEyebrow")
        }
        title={modalService ? modalService.name : t(locale, "admin.services.addTitle")}
        description={
          modalService
            ? t(locale, "admin.services.editDescription")
            : t(locale, "admin.services.createDescription")
        }
        isOpen={isModalOpen}
        onClose={closeModal}
        closeLabel={t(locale, "common.close")}
        closeAriaLabel={t(locale, "common.closeDialog")}
      >
        <ServiceModalForm service={modalService} onClose={closeModal} locale={locale} />
      </CreateEntityModal>
    </>
  );
}
