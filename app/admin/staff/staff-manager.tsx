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

function SaveStaffButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save staff member" : "Create staff member"}
    </button>
  );
}

function DeleteStaffButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Deleting..." : "Delete staff member"}
    </button>
  );
}

function StaffModalForm({
  staffMember,
  onClose,
}: {
  staffMember: StaffRecord | null;
  onClose: () => void;
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
            defaultValue={staffMember?.name ?? ""}
            className="admin-input"
          />
          <FormErrorText error={saveState.fieldErrors.name} />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Slug
            <input
            name="slug"
            defaultValue={staffMember?.slug ?? ""}
            className="admin-input"
          />
            <FormErrorText error={saveState.fieldErrors.slug} />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Title
            <input
            name="title"
            defaultValue={staffMember?.title ?? ""}
            className="admin-input"
          />
            <FormErrorText error={saveState.fieldErrors.title} />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Bio
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
            Sort order
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
            Active and assignable
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <SaveStaffButton isEditing={!!staffMember} />
          <button
            type="button"
            onClick={onClose}
            className="admin-button-secondary"
          >
            Cancel
          </button>
        </div>
      </form>

      {staffMember ? (
        <div className="admin-muted-panel px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
                Danger zone
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                Delete this staff member only if they have no linked appointments. Otherwise deactivate them.
              </p>
            </div>

            <form action={deleteAction}>
              <input type="hidden" name="staffMemberId" defaultValue={staffMember.id} />
              <DeleteStaffButton disabled={!canDelete} />
            </form>
          </div>

          {deleteState.status === "error" && deleteState.message ? (
            <p className="mt-3 text-sm text-rose-700">{deleteState.message}</p>
          ) : null}

          {!canDelete ? (
            <p className="mt-3 text-sm text-muted">
              This staff member already has appointments. Deactivate them instead of deleting them.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AddStaffCard({ onCreate }: { onCreate: () => void }) {
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
        <p className="text-xl font-semibold text-slate-900">Add staff</p>
        <p className="mt-3 max-w-sm text-sm leading-7 text-muted">
          Create a new staff member directly from the roster instead of using a separate header button.
        </p>
      </div>
    </button>
  );
}

function StaffCard({
  staffMember,
  onEdit,
}: {
  staffMember: StaffRecord;
  onEdit: (staffMember: StaffRecord) => void;
}) {
  return (
    <article className="admin-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold text-slate-900">{staffMember.name}</p>
          <p className="mt-2 text-sm text-muted">{staffMember.title ?? "No title set"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-surface px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
            {staffMember.isActive ? "Active" : "Inactive"}
          </span>
          <EditIconButton label={`Edit ${staffMember.name}`} onClick={() => onEdit(staffMember)} />
        </div>
      </div>

      <p className="mt-4 min-h-[4.5rem] line-clamp-3 text-sm leading-7 text-muted">
        {staffMember.bio ?? "No bio yet."}
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {staffMember._count?.appointments ?? 0} appointments
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {staffMember._count?.blackoutDates ?? 0} blackout dates
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          Order {staffMember.sortOrder}
        </span>
      </div>
    </article>
  );
}

function AddStaffListRow({ onCreate }: { onCreate: () => void }) {
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
          <p className="text-lg font-semibold text-slate-900">Add staff</p>
          <p className="mt-1 text-sm text-muted">Create a new roster entry</p>
        </div>
      </div>
    </button>
  );
}

function StaffListRow({
  staffMember,
  onEdit,
}: {
  staffMember: StaffRecord;
  onEdit: (staffMember: StaffRecord) => void;
}) {
  return (
    <article className="flex flex-col gap-4 px-5 py-5 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto] md:items-center md:gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-lg font-semibold text-slate-900">{staffMember.name}</p>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
            {staffMember.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{staffMember.title ?? staffMember.slug}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {staffMember._count?.appointments ?? 0} appointments
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {staffMember._count?.blackoutDates ?? 0} blackout dates
        </span>
      </div>

      <div className="flex justify-start md:justify-end">
        <EditIconButton label={`Edit ${staffMember.name}`} onClick={() => onEdit(staffMember)} />
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

export default function StaffManager({ staffMembers }: StaffManagerProps) {
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
        searchLabel="Search staff"
        searchPlaceholder="Search by name, slug, title, or bio"
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
              Showing {visibleStaffMembers.length} of {staffMembers.length} staff members.
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

      {visibleStaffMembers.length === 0 && hasFilters ? (
        <EmptyResults
          title="No staff members match these filters."
          description="Try a different search or reset the filters to bring the full roster back into view."
          actionLabel="Reset filters"
          onAction={resetFilters}
        />
      ) : (
        <CollectionViewTransition
          viewMode={viewMode}
          transitionKey={`${viewMode}:${sortValue}`}
          cards={
            <CardGrid>
              <AddStaffCard key="create-staff" onCreate={() => setIsCreateModalOpen(true)} />
              {visibleStaffMembers.map((staffMember) => (
                <StaffCard
                  key={staffMember.id}
                  staffMember={staffMember}
                  onEdit={(selectedStaffMember) => setEditingStaffMember(selectedStaffMember)}
                />
              ))}
            </CardGrid>
          }
          list={
            <ListView>
              <AddStaffListRow key="create-staff-row" onCreate={() => setIsCreateModalOpen(true)} />
              {visibleStaffMembers.map((staffMember) => (
                <div key={staffMember.id} className="border-t border-border">
                  <StaffListRow
                    staffMember={staffMember}
                    onEdit={(selectedStaffMember) => setEditingStaffMember(selectedStaffMember)}
                  />
                </div>
              ))}
            </ListView>
          }
        />
      )}

      <CreateEntityModal
        eyebrow={modalStaffMember ? "Edit staff member" : "Create staff member"}
        title={modalStaffMember ? modalStaffMember.name : "Add a team member"}
        description={
          modalStaffMember
            ? "Update a staff profile in place, then close the modal and continue scanning the roster."
            : "Create a new staff record in a focused modal without turning the page into a long stack of forms."
        }
        isOpen={isModalOpen}
        onClose={closeModal}
      >
        <StaffModalForm staffMember={modalStaffMember} onClose={closeModal} />
      </CreateEntityModal>
    </>
  );
}
