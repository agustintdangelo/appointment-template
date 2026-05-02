import type { ReactNode } from "react";

import type { AdminCollectionViewMode } from "@/app/admin/components/admin-collection-types";

export default function CollectionViewTransition({
  viewMode,
  transitionKey,
  cards,
  list,
  className = "",
}: {
  viewMode: AdminCollectionViewMode;
  transitionKey?: string;
  cards: ReactNode;
  list: ReactNode;
  className?: string;
}) {
  return (
    <div
      key={transitionKey ?? viewMode}
      data-locale-section=""
      data-locale-section-order="3"
      className={`motion-safe:animate-[admin-collection-view-enter_240ms_cubic-bezier(0.22,1,0.36,1)] motion-safe:[animation-fill-mode:both] ${className}`.trim()}
    >
      {viewMode === "cards" ? cards : list}
    </div>
  );
}
