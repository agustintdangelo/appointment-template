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

function SaveServiceButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save service" : "Create service"}
    </button>
  );
}

function DeleteServiceButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Deleting..." : "Delete service"}
    </button>
  );
}

function ServiceModalForm({
  service,
  onClose,
}: {
  service: ServiceRecord | null;
  onClose: () => void;
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

        {saveState.status === "error" && saveState.message ? (
          <div className="admin-error-banner">
            {saveState.message}
          </div>
        ) : null}

        <label className="grid gap-2 text-sm font-medium">
          Name
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
          Slug
          <input
            name="slug"
            defaultValue={service?.slug ?? ""}
            className="admin-input"
          />
          <FormErrorText error={saveState.fieldErrors.slug} />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Description
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
            Duration (minutes)
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
            Buffer (minutes)
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
            Price
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
            Sort order
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
          Active and bookable
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <SaveServiceButton isEditing={!!service} />
          <button
            type="button"
            onClick={onClose}
            className="admin-button-secondary"
          >
            Cancel
          </button>
        </div>
      </form>

      {service ? (
        <div className="admin-muted-panel px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
                Danger zone
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                Delete this service only if it has no linked appointments. Otherwise deactivate it.
              </p>
            </div>

            <form action={deleteAction}>
              <input type="hidden" name="serviceId" defaultValue={service.id} />
              <DeleteServiceButton disabled={!canDelete} />
            </form>
          </div>

          {deleteState.status === "error" && deleteState.message ? (
            <p className="mt-3 text-sm text-rose-700">{deleteState.message}</p>
          ) : null}

          {!canDelete ? (
            <p className="mt-3 text-sm text-muted">
              This service already has appointments. Deactivate it instead of deleting it.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AddServiceCard({ onCreate }: { onCreate: () => void }) {
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
        <p className="text-xl font-semibold text-slate-900">Add service</p>
        <p className="mt-3 max-w-sm text-sm leading-7 text-muted">
          Create a new service directly from the collection, without using a separate top action button.
        </p>
      </div>
    </button>
  );
}

function ServiceCard({
  service,
  onEdit,
}: {
  service: ServiceRecord;
  onEdit: (service: ServiceRecord) => void;
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
            {service.isActive ? "Active" : "Inactive"}
          </span>
          <EditIconButton label={`Edit ${service.name}`} onClick={() => onEdit(service)} />
        </div>
      </div>

      <p className="mt-4 min-h-[4.5rem] line-clamp-3 text-sm leading-7 text-muted">
        {service.description ?? "No description yet."}
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {formatServiceTiming(service.durationMinutes, service.bufferMinutes)}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {formatMoney(service.priceCents)}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {service._count?.appointments ?? 0} appointments
        </span>
      </div>
    </article>
  );
}

function AddServiceListRow({ onCreate }: { onCreate: () => void }) {
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
          <p className="text-lg font-semibold text-slate-900">Add service</p>
          <p className="mt-1 text-sm text-muted">Create a new catalog item</p>
        </div>
      </div>
    </button>
  );
}

function ServiceListRow({
  service,
  onEdit,
}: {
  service: ServiceRecord;
  onEdit: (service: ServiceRecord) => void;
}) {
  return (
    <article className="flex flex-col gap-4 px-5 py-5 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto] md:items-center md:gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-lg font-semibold text-slate-900">{service.name}</p>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
            {service.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{service.description ?? service.slug}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {formatServiceTiming(service.durationMinutes, service.bufferMinutes)}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {formatMoney(service.priceCents)}
        </span>
      </div>

      <div className="flex justify-start md:justify-end">
        <EditIconButton label={`Edit ${service.name}`} onClick={() => onEdit(service)} />
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

export default function ServicesManager({ services }: ServicesManagerProps) {
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
        searchLabel="Search services"
        searchPlaceholder="Search by name, slug, or description"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortValue={sortValue}
        onSortChange={setSortValue}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        summary={
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Showing {visibleServices.length} of {services.length} services.
            </span>
            {hasFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="admin-link"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        }
      />

      {visibleServices.length === 0 && hasFilters ? (
        <EmptyResults
          title="No services match these filters."
          description="Try a different search or reset the current filters to bring the full catalog back into view."
          actionLabel="Reset filters"
          onAction={resetFilters}
        />
      ) : (
        <CollectionViewTransition
          viewMode={viewMode}
          transitionKey={`${viewMode}:${sortValue}`}
          cards={
            <CardGrid>
              <AddServiceCard key="create-service" onCreate={() => setIsCreateModalOpen(true)} />
              {visibleServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onEdit={(selectedService) => setEditingService(selectedService)}
                />
              ))}
            </CardGrid>
          }
          list={
            <ListView>
              <AddServiceListRow
                key="create-service-row"
                onCreate={() => setIsCreateModalOpen(true)}
              />
              {visibleServices.map((service) => (
                <div key={service.id} className="border-t border-border">
                  <ServiceListRow
                    service={service}
                    onEdit={(selectedService) => setEditingService(selectedService)}
                  />
                </div>
              ))}
            </ListView>
          }
        />
      )}

      <CreateEntityModal
        eyebrow={modalService ? "Edit service" : "Create service"}
        title={modalService ? modalService.name : "Add a new service"}
        description={
          modalService
            ? "Update one service without leaving the catalog, then close the modal and return to browsing."
            : "Create a new service in a focused modal instead of pushing the entire collection down the page."
        }
        isOpen={isModalOpen}
        onClose={closeModal}
      >
        <ServiceModalForm service={modalService} onClose={closeModal} />
      </CreateEntityModal>
    </>
  );
}
