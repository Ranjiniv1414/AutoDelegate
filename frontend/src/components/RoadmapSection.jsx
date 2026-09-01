import React from "react";
import { motion } from "framer-motion";
import {
  Route, Wrench, ExternalLink, Flag, AlertTriangle, Layers, User, CalendarClock, Loader2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const ToolChip = ({ tool }) => {
  const inner = (
    <>
      <Wrench className="h-3 w-3" />
      {tool.name}
      {tool.url && <ExternalLink className="h-3 w-3 opacity-60" />}
    </>
  );
  const cls =
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-primary/25 bg-primary/10 text-primary hover:bg-primary/20 transition-colors";
  return tool.url ? (
    <a href={tool.url} target="_blank" rel="noreferrer" className={cls} title={tool.why}>{inner}</a>
  ) : (
    <span className={cls} title={tool.why}>{inner}</span>
  );
};

export const RoadmapSection = ({ roadmap, onGenerate, loading }) => {
  if (!roadmap) {
    return (
      <Card className="p-6 glass border-dashed" data-testid="roadmap-cta-card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              <Route className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">Build the Project Roadmap</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Turn this discussion into a phased plan with milestones, owners, and recommended real-world tools.
              </p>
            </div>
          </div>
          <Button size="lg" onClick={onGenerate} disabled={loading} data-testid="generate-roadmap-button">
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Planning…</>
            ) : (
              <><Sparkles className="h-5 w-5" /> Generate Roadmap</>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5" data-testid="roadmap-section">
      {/* Header */}
      <Card className="p-6 glass">
        <div className="flex items-center gap-2 text-primary font-semibold mb-1">
          <Route className="h-4 w-4" /> Project Roadmap
        </div>
        <h3 className="font-display text-2xl font-bold">{roadmap.project_name}</h3>
        <p className="text-muted-foreground mt-1">{roadmap.objective}</p>
      </Card>

      {/* Recommended stack */}
      {roadmap.recommended_stack?.length > 0 && (
        <Card className="p-5" data-testid="recommended-stack-card">
          <div className="flex items-center gap-2 mb-3 font-semibold text-primary">
            <Layers className="h-4 w-4" /> Recommended Stack
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roadmap.recommended_stack.map((t, i) => (
              <a
                key={i}
                href={t.url || undefined}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-lg border border-border bg-muted/20 hover:border-primary/40 transition-colors block"
                data-testid={`stack-item-${i}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{t.name}</span>
                  {t.url && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <div className="text-[11px] font-mono text-primary/80 mb-1">{t.category}</div>
                <p className="text-xs text-muted-foreground">{t.why}</p>
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Phases timeline */}
      <div className="relative pl-6 sm:pl-8">
        <div className="absolute left-[9px] sm:left-[13px] top-2 bottom-2 w-[2px] bg-border" />
        <div className="space-y-4">
          {roadmap.phases?.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative"
              data-testid={`roadmap-phase-${i}`}
            >
              <div className="absolute -left-[22px] sm:-left-[30px] top-4 h-5 w-5 rounded-full bg-primary border-4 border-background" />
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h4 className="font-display font-bold text-lg">
                    <span className="text-primary mr-2 font-mono text-sm">P{i + 1}</span>{p.name}
                  </h4>
                  <span className="text-xs font-mono px-2 py-1 rounded-full bg-accent text-accent-foreground border border-primary/20">
                    {p.timeline}
                  </span>
                </div>
                {p.goal && <p className="text-sm text-muted-foreground mb-3">{p.goal}</p>}

                <div className="space-y-3">
                  {p.tasks?.map((t, j) => (
                    <div key={j} className="p-3 rounded-lg border border-border bg-muted/20" data-testid={`roadmap-task-${i}-${j}`}>
                      <p className="text-sm font-medium">{t.task}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground font-mono">
                        {t.owner && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {t.owner}</span>}
                        {t.deadline && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {t.deadline}</span>}
                      </div>
                      {t.recommended_tools?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2.5">
                          {t.recommended_tools.map((tool, k) => <ToolChip key={k} tool={tool} />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {p.milestone && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-emerald-400">
                    <Flag className="h-4 w-4" /> <span className="font-medium">Milestone:</span> {p.milestone}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Risks */}
      {roadmap.risks?.length > 0 && (
        <Card className="p-5 border-amber-500/25 bg-amber-500/5" data-testid="roadmap-risks-card">
          <div className="flex items-center gap-2 mb-2 font-semibold text-amber-400">
            <AlertTriangle className="h-4 w-4" /> Risks & Blockers to Watch
          </div>
          <ul className="space-y-1.5">
            {roadmap.risks.map((r, i) => (
              <li key={i} className="text-sm flex gap-2 text-foreground/90">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" /> {r}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
