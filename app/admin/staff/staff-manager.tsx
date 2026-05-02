"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import {
  deleteStaffMemberAction,
  upsertStaffMemberAction,
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
import { t, type AppLocale } from "@/lib/i18n";

type StaffRecord = {
  id: string;
  name: string;
  slug: string;
  title: string | null;
  bio: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: {
    appointments: number;
    availabilities: number;
    blackoutDates: number;
  };
};

type StaffManagerProps = {
  staffMembers: StaffRecord[];
  locale: AppLocale;
};

const VIEW_MODE_STORAGE_KEY = "appointment-admin-staff-view-mode";

function matchesStaffQuery(staffMember: StaffRecord, query: string) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();

  return [staffMember.name, staffMember.slug, staffMember.title ?? "", staffMember.bio ?? ""].some(
    (value) => value.toLowerCase().includes(normalizedQuery),
  );
}

function matchesStatusFilter(staffMember: StaffRecord, filter: AdminCollectionStatusFilter) {
  if (filter === "active") {
    return staffMember.isActive;
  }

  if (filter === "inactive") {
    return !staffMember.isActive;
  }

  return true;
}

function sortStaffMembers(staffMembers: StaffRecord[], sortValue: AdminCollectionSort) {
  const nextStaffMembers = [...staffMembers];

  if (sortValue === "name-asc") {
    nextStaffMembers.sort((left, right) => left.name.localeCompare(right.name));
    return nextStaffMembers;
  }

  if (sortValue === "name-desc") {
    nextStaffMembers.sort((left, right) => right.name.localeCompare(left.name));
    return nextStaffMembers;
  }

  return nextStaffMembers;
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

function SaveStaffButton({
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
          ? t(locale, "admin.staff.save")
          : t(locale, "admin.staff.create")}
    </button>
  );
}

function DeleteStaffButton({
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
      {pending ? t(locale, "common.deleting") : t(locale, "admin.staff.delete")}
    </button>
  );
}

function StaffModalForm({
  staffMember,
  onClose,
  locale,
}: {
  staffMember: StaffRecord | null;
  onClose: () => void;
  locale: AppLocale;
}) {
  const router = useRouter();
  const [saveState, saveAction] = useActionState(
    upsertStaffMemberAction,
    initialAdminEntityActionState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteStaffMemberAction,
    initialAdminEntityActionState,
  );
  const canDelete = !!staffMember && (staffMember._count?.appointments ?? 0) === 0;

  useEffect(() => {
    if (saveState.status === "success" || deleteState.status === "success") {
      onClose();
      router.refresh();
    }
  }, [deleteState.status, onClose, router, saveState.status]);

  return (
    <div className="grid gap-6">
      <form action={saveAction} className="grid gap-5">
        <input type="hidden" name="staffMemberId" defaultValue={staffMember?.id ?? ""} />
        <input type="hidden" name="locale" value={locale} />

        {saveState.status === "error" && saveState.message ? (
          <div className="admin-error-banner">
            {saveState.message}
          </div>
        ) : null}

        <label className="grid gap-2 text-sm font-medium">
          {t(locale, "admin.staff.name")}
          <input
            name="name"
            required
            autoFocus
            defaultValue={staffMember?.name ?? ""}
            className="admin-input"
          />
          <FormErrorText error={saveState.fieldErrors.name} />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "admin.staff.slug")}
            <input
            name="slug"
            defaultValue={staffMember?.slug ?? ""}
            className="admin-input"
          />
            <FormErrorText error={saveState.fieldErrors.slug} />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "admin.staff.titleField")}
            <input
            name="title"
            defaultValue={staffMember?.title ?? ""}
            className="admin-input"
          />
            <FormErrorText error={saveState.fieldErrors.title} />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          {t(locale, "admin.staff.bio")}
          <textarea
            name="bio"
            rows={5}
            defaultValue={staffMember?.bio ?? ""}
            className="admin-textarea"
          />
          <FormErrorText error={saveState.fieldErrors.bio} />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "admin.staff.sortOrder")}
            <input
              name="sortOrder"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={staffMember?.sortOrder ?? 0}
              className="admin-input"
            />
            <FormErrorText error={saveState.fieldErrors.sortOrder} />
          </label>

          <label className="flex items-center gap-3 self-end text-sm font-medium">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={staffMember ? staffMember.isActive : true}
              className="admin-checkbox"
            />
            {t(locale, "admin.staff.activeAssignable")}
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <SaveStaffButton isEditing={!!staffMember} locale={locale} />
          <button
            type="button"
            onClick={onClose}
            className="admin-button-secondary"
          >
            {t(locale, "common.cancel")}
          </button>
        </div>
      </form>

      {staffMember ? (
        <div className="admin-muted-panel px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
                {t(locale, "admin.staff.danger")}
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                {t(locale, "admin.staff.dangerDescription")}
              </p>
            </div>

            <form action={deleteAction}>
              <input type="hidden" name="staffMemberId" defaultValue={staffMember.id} />
              <input type="hidden" name="locale" value={locale} />
              <DeleteStaffButton disabled={!canDelete} locale={locale} />
            </form>
          </div>

          {deleteState.status === "error" && deleteState.message ? (
            <p className="mt-3 text-sm text-rose-700">{deleteState.message}</p>
          ) : null}

          {!canDelete ? (
            <p className="mt-3 text-sm text-muted">
              {t(locale, "admin.staff.cannotDelete")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AddStaffCard({ onCreate, locale }: { onCreate: () => void; locale: AppLocale }) {
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
          {t(locale, "admin.staff.add")}
        </p>
        <p className="mt-3 max-w-sm text-sm leading-7 text-muted">
          {t(locale, "admin.staff.addDescription")}
        </p>
      </div>
    </button>
  );
}

function StaffCard({
  staffMember,
  onEdit,
  locale,
}: {
  staffMember: StaffRecord;
  onEdit: (staffMember: StaffRecord) => void;
  locale: AppLocale;
}) {
  return (
    <article className="admin-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold text-slate-900">{staffMember.name}</p>
          <p className="mt-2 text-sm text-muted">
            {staffMember.title ?? t(locale, "common.noTitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-surface px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
            {staffMember.isActive ? t(locale, "common.active") : t(locale, "common.inactive")}
          </span>
          <EditIconButton
            label={t(locale, "admin.staff.editLabel", { name: staffMember.name })}
            onClick={() => onEdit(staffMember)}
          />
        </div>
      </div>

      <p className="mt-4 min-h-[4.5rem] line-clamp-3 text-sm leading-7 text-muted">
        {staffMember.bio ?? t(locale, "common.noBio")}
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {t(locale, "common.appointments")}: {staffMember._count?.appointments ?? 0}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {t(locale, "admin.staff.blackoutDatesCount", {
            count: staffMember._count?.blackoutDates ?? 0,
          })}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {t(locale, "admin.staff.order", { order: staffMember.sortOrder })}
        </span>
      </div>
    </article>
  );
}

function AddStaffListRow({ onCreate, locale }: { onCreate: () => void; locale: AppLocale }) {
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
            {t(locale, "admin.staff.add")}
          </p>
          <p className="mt-1 text-sm text-muted">{t(locale, "admin.staff.addListDescription")}</p>
        </div>
      </div>
    </button>
  );
}

function StaffListRow({
  staffMember,
  onEdit,
  locale,
}: {
  staffMember: StaffRecord;
  onEdit: (staffMember: StaffRecord) => void;
  locale: AppLocale;
}) {
  return (
    <article className="flex flex-col gap-4 px-5 py-5 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto] md:items-center md:gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-lg font-semibold text-slate-900">{staffMember.name}</p>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
            {staffMember.isActive ? t(locale, "common.active") : t(locale, "common.inactive")}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{staffMember.title ?? staffMember.slug}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {t(locale, "common.appointments")}: {staffMember._count?.appointments ?? 0}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {t(locale, "admin.staff.blackoutDatesCount", {
            count: staffMember._count?.blackoutDates ?? 0,
          })}
        </span>
      </div>

      <div className="flex justify-start md:justify-end">
        <EditIconButton
          label={t(locale, "admin.staff.editLabel", { name: staffMember.name })}
          onClick={() => onEdit(staffMember)}
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
    <div
      data-locale-section=""
      data-locale-section-order="3"
      className="admin-card-dashed px-6 py-10 text-center"
    >
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

export default function StaffManager({ staffMembers, locale }: StaffManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminCollectionStatusFilter>("all");
  const [sortValue, setSortValue] = useState<AdminCollectionSort>("default");
  const [viewMode, setViewMode] = useSessionCollectionViewMode(VIEW_MODE_STORAGE_KEY);
  const [editingStaffMember, setEditingStaffMember] = useState<StaffRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const visibleStaffMembers = sortStaffMembers(
    staffMembers.filter(
      (staffMember) =>
        matchesStaffQuery(staffMember, searchQuery.trim()) &&
        matchesStatusFilter(staffMember, statusFilter),
    ),
    sortValue,
  );
  const hasFilters =
    searchQuery.trim().length > 0 || statusFilter !== "all" || sortValue !== "default";
  const isModalOpen = isCreateModalOpen || editingStaffMember !== null;
  const modalStaffMember = isCreateModalOpen ? null : editingStaffMember;

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setSortValue("default");
  }

  function closeModal() {
    setEditingStaffMember(null);
    setIsCreateModalOpen(false);
  }

  return (
    <>
      <AdminListHeader
        searchLabel={t(locale, "admin.staff.searchLabel")}
        searchPlaceholder={t(locale, "admin.staff.searchPlaceholder")}
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
              {t(locale, "admin.staff.showing", {
                visible: visibleStaffMembers.length,
                total: staffMembers.length,
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

      {visibleStaffMembers.length === 0 && hasFilters ? (
        <EmptyResults
          title={t(locale, "admin.staff.noMatchesTitle")}
          description={t(locale, "admin.staff.noMatchesDescription")}
          actionLabel={t(locale, "common.resetFilters")}
          onAction={resetFilters}
        />
      ) : (
        <CollectionViewTransition
          viewMode={viewMode}
          transitionKey={`${viewMode}:${sortValue}`}
          cards={
            <CardGrid>
              <AddStaffCard
                key="create-staff"
                onCreate={() => setIsCreateModalOpen(true)}
                locale={locale}
              />
              {visibleStaffMembers.map((staffMember) => (
                <StaffCard
                  key={staffMember.id}
                  staffMember={staffMember}
                  onEdit={(selectedStaffMember) => setEditingStaffMember(selectedStaffMember)}
                  locale={locale}
                />
              ))}
            </CardGrid>
          }
          list={
            <ListView>
              <AddStaffListRow
                key="create-staff-row"
                onCreate={() => setIsCreateModalOpen(true)}
                locale={locale}
              />
              {visibleStaffMembers.map((staffMember) => (
                <div key={staffMember.id} className="border-t border-border">
                  <StaffListRow
                    staffMember={staffMember}
                    onEdit={(selectedStaffMember) => setEditingStaffMember(selectedStaffMember)}
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
          modalStaffMember
            ? t(locale, "admin.staff.editEyebrow")
            : t(locale, "admin.staff.createEyebrow")
        }
        title={modalStaffMember ? modalStaffMember.name : t(locale, "admin.staff.addTitle")}
        description={
          modalStaffMember
            ? t(locale, "admin.staff.editDescription")
            : t(locale, "admin.staff.createDescription")
        }
        isOpen={isModalOpen}
        onClose={closeModal}
        closeLabel={t(locale, "common.close")}
        closeAriaLabel={t(locale, "common.closeDialog")}
      >
        <StaffModalForm
          staffMember={modalStaffMember}
          onClose={closeModal}
          locale={locale}
        />
      </CreateEntityModal>
    </>
  );
}
