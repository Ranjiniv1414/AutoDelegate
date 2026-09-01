import React, { useEffect, useState } from "react";
import { History, Clock, ListChecks, Loader2, FileText, Mic } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";
import { listMeetings } from "@/lib/api";
import { cn } from "@/lib/utils";

const fmt = (iso) => {
  try { return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
};

export const MeetingHistory = ({ open, onOpenChange, onSelect, activeId }) => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listMeetings()
      .then(setMeetings)
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[92vw] sm:max-w-md overflow-y-auto" data-testid="history-panel">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Meeting History
          </SheetTitle>
          <SheetDescription>Revisit any past meeting analysis in one click.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}

          {!loading && meetings.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-10" data-testid="history-empty">
              No meetings yet. Analyze one to see it here.
            </div>
          )}

          {!loading && meetings.map((m, i) => {
            const actions = m.actions || [];
            const executed = actions.filter((a) => a.status === "executed").length;
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-colors",
                  m.id === activeId
                    ? "border-primary/50 bg-accent"
                    : "border-border hover:border-primary/40 hover:bg-accent/40"
                )}
                data-testid={`history-item-${i}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-semibold truncate">{m.title || "Untitled Meeting"}</span>
                  {m.status && <StatusBadge status={m.status === "analyzed" ? "approved" : m.status === "transcribed" ? "pending" : "executed"} />}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {fmt(m.created_at)}</span>
                  <span className="inline-flex items-center gap-1">
                    {m.source === "audio" ? <Mic className="h-3 w-3" /> : <FileText className="h-3 w-3" />} {m.source}
                  </span>
                  <span className="inline-flex items-center gap-1"><ListChecks className="h-3 w-3" /> {actions.length} action(s)</span>
                  {executed > 0 && <span className="text-indigo-300">{executed} executed</span>}
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
