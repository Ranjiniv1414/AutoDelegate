import React from "react";
import { FileAudio, Users, Brain, ListTodo, ShieldCheck, Rocket, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "meeting", label: "MEETING", icon: FileAudio },
  { key: "understand", label: "UNDERSTAND", icon: Users },
  { key: "reason", label: "REASON", icon: Brain },
  { key: "plan", label: "PLAN", icon: ListTodo },
  { key: "approve", label: "APPROVE", icon: ShieldCheck },
  { key: "execute", label: "EXECUTE", icon: Rocket },
];

export const PipelineStepper = ({ active = 0 }) => {
  return (
    <div className="w-full overflow-x-auto" data-testid="pipeline-stepper">
      <div className="flex items-center min-w-[640px] gap-1 sm:gap-2 py-2">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const done = i < active;
          const current = i === active;
          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center gap-2 shrink-0" data-testid={`stage-${stage.key}`}>
                <div
                  className={cn(
                    "flex items-center justify-center h-10 w-10 rounded-xl border transition-all duration-300",
                    current && "bg-primary text-primary-foreground border-primary pulse-ring",
                    done && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                    !done && !current && "bg-muted/40 text-muted-foreground border-border"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-mono tracking-widest",
                    current ? "text-primary" : done ? "text-emerald-400" : "text-muted-foreground"
                  )}
                >
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={cn(
                    "h-[2px] flex-1 rounded-full transition-colors duration-500 mb-6",
                    i < active ? "bg-emerald-500/40" : "bg-border"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
