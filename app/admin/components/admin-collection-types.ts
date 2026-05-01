export type AdminCollectionViewMode = "cards" | "list";
export type AdminCollectionStatusFilter = "all" | "active" | "inactive";
export type AdminCollectionSort = "default" | "name-asc" | "name-desc";

export type AdminEntityActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Record<string, string>;
};

export const initialAdminEntityActionState: AdminEntityActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};
