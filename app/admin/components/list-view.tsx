import type { ReactNode } from "react";

export default function ListView({ children }: { children: ReactNode }) {
  return <div className="admin-list-shell">{children}</div>;
}
