import React, { useState } from "react";
import { Check, X, Pencil, ShieldCheck, Rocket, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { toolMeta, TOOL_META } from "@/lib/tools";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const ApprovalView = ({ meeting, onUpdateAction, onEditAction, onExecuteAll, demoMode, busyIds }) => {
  const actions = meeting.actions || [];
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const openEdit = (a) => {
    setEditing(a);
    setForm({ person: a.person, task: a.task, deadline: a.deadline, action_type: a.action_type });
  };

  const saveEdit = async () => {
    await onEditAction(editing.id, form);
    setEditing(null);
  };

  const approvedCount = actions.filter((a) => a.status === "approved" || a.status === "modified").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Action Approval
          </h2>
          <p className="text-muted-foreground text-sm">
            Nothing runs without you. Review each proposed action, edit if needed, then approve.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => actions.forEach((a) => (a.status === "pending") && onUpdateAction(a.id, "approved"))} data-testid="approve-all-button">
            <Check className="h-4 w-4" /> Approve All
          </Button>
          <Button variant="outline" size="sm" onClick={() => actions.forEach((a) => (a.status === "pending") && onUpdateAction(a.id, "rejected"))} data-testid="reject-all-button">
            <X className="h-4 w-4" /> Reject All
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {actions.map((a, i) => {
          const tm = toolMeta(a.action_type);
          const locked = a.status === "executed";
          return (
            <Card key={a.id} className="p-5" data-testid={`approval-card-${i}`}>
              <div className="flex flex-wrap items-start gap-4">
                <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center border shrink-0", tm.bg, tm.color)}>
                  <tm.Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-[200px] space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{a.person || "Unassigned"}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className={cn("text-xs font-mono", tm.color)}>{tm.label}</span>
                  </div>
                  <p className="text-sm text-foreground/90">{a.task}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                    <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {a.deadline || "no deadline"}</span>
                    <span>· confidence {Math.round((a.confidence || 0) * 100)}%</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <StatusBadge status={a.status} />
                  {!locked && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={a.status === "approved" || a.status === "modified" ? "default" : "outline"}
                        onClick={() => onUpdateAction(a.id, "approved")}
                        data-testid={`approve-button-${i}`}
                      >
                        <Check className="h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(a)} data-testid={`edit-button-${i}`}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onUpdateAction(a.id, "rejected")} data-testid={`reject-button-${i}`}>
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 sticky bottom-4">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{approvedCount}</span> action(s) approved and ready
          {demoMode && <span className="ml-2 text-amber-400 font-mono text-xs">· will run in DEMO MODE</span>}
        </div>
        <Button size="lg" onClick={onExecuteAll} disabled={!approvedCount || busyIds?.length > 0} data-testid="execute-approved-button">
          <Rocket className="h-5 w-5" /> Execute Approved Actions
        </Button>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent data-testid="edit-action-dialog">
          <DialogHeader>
            <DialogTitle>Edit Action</DialogTitle>
            <DialogDescription>Adjust the owner, task, deadline or target tool before approving.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Person</Label>
              <Input value={form.person || ""} onChange={(e) => setForm({ ...form, person: e.target.value })} data-testid="edit-person-input" />
            </div>
            <div className="space-y-1.5">
              <Label>Task</Label>
              <Input value={form.task || ""} onChange={(e) => setForm({ ...form, task: e.target.value })} data-testid="edit-task-input" />
            </div>
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <Input value={form.deadline || ""} onChange={(e) => setForm({ ...form, deadline: e.target.value })} data-testid="edit-deadline-input" />
            </div>
            <div className="space-y-1.5">
              <Label>Tool</Label>
              <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                <SelectTrigger data-testid="edit-tool-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TOOL_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} data-testid="save-edit-button">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
