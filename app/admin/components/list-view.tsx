import type { ReactNode } from "react";

export default function ListView({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card/95 shadow-[0_24px_70px_-55px_rgba(34,29,24,0.35)]">
      {children}
    </div>
  );
}
