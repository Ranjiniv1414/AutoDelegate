import React from "react";
import { cn } from "@/lib/utils";

const MAP = {
  pending: { label: "Pending Approval", cls: "bg-amber-500/10 text-amber-400 border-amber-500/25" },
  approved: { label: "Approved", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" },
  modified: { label: "Modified", cls: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25" },
  rejected: { label: "Rejected", cls: "bg-rose-500/10 text-rose-400 border-rose-500/25" },
  executed: { label: "Executed", cls: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25" },
  failed: { label: "Failed", cls: "bg-rose-500/10 text-rose-400 border-rose-500/25" },
};

export const StatusBadge = ({ status }) => {
  const s = MAP[status] || MAP.pending;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", s.cls)}
      data-testid={`status-badge-${status}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
};
