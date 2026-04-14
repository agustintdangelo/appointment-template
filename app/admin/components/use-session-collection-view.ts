"use client";

import { useEffect, useState } from "react";

import type { AdminCollectionViewMode } from "@/app/admin/components/admin-collection-types";

export default function useSessionCollectionViewMode(storageKey: string) {
  const [viewMode, setViewMode] = useState<AdminCollectionViewMode>(() => {
    if (typeof window === "undefined") {
      return "cards";
    }

    const storedValue = window.sessionStorage.getItem(storageKey);
    return storedValue === "list" ? "list" : "cards";
  });

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, viewMode);
  }, [storageKey, viewMode]);

  return [viewMode, setViewMode] as const;
}
