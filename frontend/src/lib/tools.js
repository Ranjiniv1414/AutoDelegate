import { Bug, Mail, CalendarClock, HelpCircle } from "lucide-react";

export const TOOL_META = {
  jira: { label: "Jira", Icon: Bug, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/25" },
  gmail: { label: "Gmail", Icon: Mail, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/25" },
  calendar: { label: "Google Calendar", Icon: CalendarClock, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25" },
  none: { label: "None", Icon: HelpCircle, color: "text-muted-foreground", bg: "bg-muted/40 border-border" },
};

export const toolMeta = (t) => TOOL_META[t] || TOOL_META.none;
