import React from "react";
import { Zap, Moon, Sun, History } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Header = ({ demoMode, setDemoMode, theme, toggleTheme, onReset, onOpenHistory }) => {
  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 group"
          data-testid="brand-home-button"
        >
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
            <Zap className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
          <div className="text-left leading-none">
            <div className="font-display font-extrabold text-lg tracking-tight">AutoDelegate</div>
            <div className="text-[10px] font-mono text-muted-foreground tracking-wider">MEETING → ACTION AGENT</div>
          </div>
        </button>

        <div className="flex items-center gap-3 sm:gap-5">
          <button
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent transition-colors"
            data-testid="open-history-button"
          >
            <History className="h-4 w-4" /> <span className="hidden sm:inline">History</span>
          </button>

          <div
            className={cn(
              "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono",
              demoMode
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            )}
            data-testid="demo-mode-indicator"
          >
            <span className={cn("h-2 w-2 rounded-full", demoMode ? "bg-amber-400 amber-pulse" : "bg-emerald-400")} />
            {demoMode ? "DEMO MODE" : "LIVE MODE"}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden md:inline">Demo</span>
            <Switch checked={demoMode} onCheckedChange={setDemoMode} data-testid="demo-mode-toggle" />
          </div>

          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
            data-testid="theme-toggle"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
