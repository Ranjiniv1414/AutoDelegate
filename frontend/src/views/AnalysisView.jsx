import React from "react";
import { motion } from "framer-motion";
import { FileText, CheckCircle2, MessageSquare, ListTodo, ArrowRight, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toolMeta } from "@/lib/tools";
import { RoadmapSection } from "@/components/RoadmapSection";
import { cn } from "@/lib/utils";

const ListCard = ({ title, icon: Icon, items, accent, testid, empty }) => (
  <Card className="p-5" data-testid={testid}>
    <div className={cn("flex items-center gap-2 mb-3 font-semibold", accent)}>
      <Icon className="h-4 w-4" /> {title}
      <span className="ml-auto text-xs font-mono text-muted-foreground">{items?.length || 0}</span>
    </div>
    {items?.length ? (
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm flex gap-2">
            <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", accent?.replace("text-", "bg-"))} />
            <span className="text-foreground/90">{it}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-muted-foreground">{empty}</p>
    )}
  </Card>
);

export const AnalysisView = ({ meeting, onProceed, onGenerateRoadmap, roadmapLoading, onSendToApprovals, sendingToApprovals }) => {
  const actions = meeting.actions || [];
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-2xl sm:text-3xl font-bold">Meeting Analysis</h2>
        <p className="text-muted-foreground text-sm">The agent reasoned over the transcript and separated talk from commitments.</p>
      </div>

      {/* Summary */}
      <Card className="p-6 glass" data-testid="summary-card">
        <div className="flex items-center gap-2 mb-2 font-semibold text-primary">
          <FileText className="h-4 w-4" /> Executive Summary
        </div>
        <p className="text-foreground/90 leading-relaxed">{meeting.summary || "No summary available."}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard title="Decisions" icon={CheckCircle2} items={meeting.decisions} accent="text-emerald-400" testid="decisions-card" empty="No firm decisions detected." />
        <ListCard title="Opinions & Suggestions" icon={MessageSquare} items={meeting.opinions} accent="text-cyan-400" testid="opinions-card" empty="No opinions detected." />
      </div>

      {/* Action items matrix */}
      <Card className="p-5" data-testid="action-items-card">
        <div className="flex items-center gap-2 mb-4 font-semibold text-primary">
          <ListTodo className="h-4 w-4" /> Extracted Action Items
          <span className="ml-auto text-xs font-mono text-muted-foreground">{actions.length}</span>
        </div>

        {actions.length ? (
          <div className="space-y-3">
            {actions.map((a, i) => {
              const tm = toolMeta(a.action_type);
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-muted/20"
                  data-testid={`analysis-action-${i}`}
                >
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-xs font-semibold text-primary">
                      {(a.person || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{a.person || "Unassigned"}</span>
                  </div>
                  <div className="flex-1 min-w-[180px] text-sm">{a.task}</div>
                  <div className="text-xs font-mono text-muted-foreground min-w-[90px]">
                    {a.deadline || "no deadline"}
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border", tm.bg, tm.color)}>
                    <tm.Icon className="h-3 w-3" /> {tm.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground">
                    <Gauge className="h-3 w-3" /> {Math.round((a.confidence || 0) * 100)}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No actionable commitments were extracted from this meeting.</p>
        )}
      </Card>

      {/* Project roadmap */}
      <RoadmapSection
        roadmap={meeting.roadmap}
        onGenerate={onGenerateRoadmap}
        loading={roadmapLoading}
        onSendToApprovals={onSendToApprovals}
        sendingToApprovals={sendingToApprovals}
      />

      <div className="flex justify-end">
        <Button size="lg" onClick={onProceed} disabled={!actions.length} data-testid="proceed-to-approval-button">
          Review & Approve Actions <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
