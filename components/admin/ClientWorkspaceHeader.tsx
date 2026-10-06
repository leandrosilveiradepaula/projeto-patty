import type { ReactNode } from "react";

import {
  ClientSummaryHeader,
  type ClientSummaryHeaderProps,
} from "@/components/admin/ClientSummaryHeader";

type ClientWorkspaceHeaderProps = Omit<
  ClientSummaryHeaderProps,
  "name" | "visual"
> & {
  displayName: string | null | undefined;
  visual?: ReactNode;
};

function getInitials(displayName: string | null | undefined) {
  const words = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];

  return (
    words
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function ClientWorkspaceHeader({
  displayName,
  visual,
  ...props
}: ClientWorkspaceHeaderProps) {
  const normalizedDisplayName = displayName?.trim();

  return (
    <ClientSummaryHeader
      {...props}
      name={normalizedDisplayName || "Cliente sem nome informado"}
      visual={visual ?? <span>{getInitials(normalizedDisplayName)}</span>}
    />
  );
}
