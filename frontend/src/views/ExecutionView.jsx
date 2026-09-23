import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Rocket, RotateCw, ExternalLink, Home, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toolMeta } from "@/lib/tools";
import { cn } from "@/lib/utils";

const ResultDetail = ({ result }) => {
  if (!result?.detail) return null;
  const d = result.detail;
  const rows = Object.entries(d).filter(([, v]) => v);
  return (
    <div className="mt-3 rounded-lg bg-muted/30 border border-border p-3 font-mono text-xs space-y-1">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="text-muted-foreground min-w-[90px]">{k}:</span>
          {String(v).startsWith("http") ? (
            <a href={v} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline break-all">
              {v} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : (
            <span className="text-foreground/90 break-all">{String(v)}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export const ExecutionView = ({ meeting, onExecute, onRetry, onRestart, busyIds }) => {
  const actions = (meeting.actions || []).filter(
    (a) => ["approved", "modified", "executed", "failed"].includes(a.status)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" /> Execution Results
        </h2>
        <p className="text-muted-foreground text-sm">Real-time status of every approved action as the agent executes it.</p>
      </div>

      <div className="space-y-4">
        {actions.map((a, i) => {
          const tm = toolMeta(a.action_type);
          const busy = busyIds?.includes(a.id);
          const r = a.execution_result;
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5" data-testid={`execution-card-${i}`}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center border shrink-0", tm.bg, tm.color)}>
                    <tm.Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{a.person || "Unassigned"}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={cn("text-xs font-mono", tm.color)}>{tm.label}</span>
                      {r?.demo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/25">
                          <
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/90 mt-1">{a.task}</p>

                    {busy && (
                      <div className="flex items-center gap-2 text-sm text-primary mt-3" data-testid={`executing-${i}`}>
                        <Loader2 className="h-4 w-4 animate-spin" /> Executing via {tm.label}…
                      </div>
                    )}

                    {!busy && r && (
                      <>
                        <div className={cn("flex items-center gap-2 text-sm mt-3 font-medium", r.success ? "text-emerald-400" : "text-rose-400")}>
                          {r.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          {r.message}
                        </div>
                        {r.success && <ResultDetail result={r} />}
                        {!r.success && (
                          <Button size="sm" variant="outline" className="mt-3" onClick={() => onRetry(a.id)} data-testid={`retry-button-${i}`}>
                            <RotateCw className="h-4 w-4" /> Retry
                          </Button>
                        )}
                      </>
                    )}

                    {!busy && !r && (
                      <Button size="sm" className="mt-3" onClick={() => onExecute(a.id)} data-testid={`execute-single-${i}`}>
                        <Rocket className="h-4 w-4" /> Execute
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {!actions.length && (
        <Card className="p-10 text-center text-muted-foreground" data-testid="no-actions-message">
          No approved actions to execute. Go back and approve some actions first.
        </Card>
      )}

      <div className="flex justify-center pt-2">
        <Button variant="outline" size="lg" onClick={onRestart} data-testid="new-meeting-button">
          <Home className="h-5 w-5" /> Analyze Another Meeting
        </Button>
      </div>
    </div>
  );
};
