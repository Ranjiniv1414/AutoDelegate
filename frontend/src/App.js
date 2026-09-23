import { useEffect, useState } from "react";
import "@/App.css";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { PipelineStepper } from "@/components/PipelineStepper";
import { HomeView } from "@/views/HomeView";
import { SpeakerMappingView } from "@/views/SpeakerMappingView";
import { AnalysisView } from "@/views/AnalysisView";
import { ApprovalView } from "@/views/ApprovalView";
import { ExecutionView } from "@/views/ExecutionView";
import { MeetingHistory } from "@/components/MeetingHistory";
import {
  uploadAudio, createMeeting, analyzeMeeting, editAction, executeAction, generateRoadmap, roadmapToActions,
} from "@/lib/api";

const STEP_STAGE = { home: 0, mapping: 1, analysis: 3, approval: 4, execution: 5 };

function App() {
  const [theme, setTheme] = useState("dark");
  const [demoMode, setDemoMode] = useState(true);
  const [step, setStep] = useState("home");
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [busyIds, setBusyIds] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [sendingToApprovals, setSendingToApprovals] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const reset = () => {
    setStep("home");
    setMeeting(null);
    setBusyIds([]);
  };

  const handleIngest = async ({ mode, transcript, audioFile }) => {
    setLoading(true);
    try {
      let m;
      if (mode === "audio") {
        setLoadingMsg("Transcribing audio…");
        m = await uploadAudio(audioFile);
      } else {
        setLoadingMsg("Preparing transcript…");
        m = await createMeeting(transcript);
      }
      setMeeting(m);
      setStep("mapping");
      toast.success("Transcript ready — map your speakers.");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to process meeting.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const handleConfirmParticipants = async (map) => {
    setLoading(true);
    try {
      const m = await analyzeMeeting(meeting.id, map);
      setMeeting(m);
      setStep("analysis");
      toast.success(`Found ${m.actions?.length || 0} action item(s).`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const updateActionStatus = async (actionId, status) => {
    try {
      const m = await editAction({ meeting_id: meeting.id, action_id: actionId, status });
      setMeeting(m);
    } catch (e) {
      toast.error("Could not update action.");
    }
  };

  const handleEditAction = async (actionId, form) => {
    try {
      const m = await editAction({ meeting_id: meeting.id, action_id: actionId, ...form });
      setMeeting(m);
      toast.success("Action updated.");
    } catch (e) {
      toast.error("Could not save changes.");
    }
  };

  const runExecute = async (actionId) => {
    setBusyIds((b) => [...b, actionId]);
    try {
      const { action } = await executeAction(meeting.id, actionId, demoMode);
      setMeeting((prev) => ({
        ...prev,
        actions: prev.actions.map((a) => (a.id === actionId ? action : a)),
      }));
      if (action.execution_result?.success) {
        toast.success(action.execution_result.message);
      } else {
        toast.error(action.execution_result?.message || "Execution failed.");
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Execution failed.");
    } finally {
      setBusyIds((b) => b.filter((id) => id !== actionId));
    }
  };

  const handleExecuteAll = async () => {
    setStep("execution");
    const toRun = (meeting.actions || []).filter((a) => a.status === "approved" || a.status === "modified");
    for (const a of toRun) {
      await runExecute(a.id);
    }
  };

  const handleSelectHistory = (m) => {
    setMeeting(m);
    setBusyIds([]);
    if (m.actions && m.actions.length) {
      const anyExecuted = m.actions.some((a) => a.execution_result);
      setStep(anyExecuted ? "execution" : "analysis");
    } else {
      setStep("mapping");
    }
    setHistoryOpen(false);
    toast.success(`Loaded "${m.title || "meeting"}"`);
  };

  const handleGenerateRoadmap = async () => {
    setRoadmapLoading(true);
    try {
      const m = await generateRoadmap(meeting.id);
      setMeeting(m);
      toast.success(`Roadmap ready — ${m.roadmap?.phases?.length || 0} phase(s).`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Roadmap generation failed.");
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleSendRoadmapToApprovals = async () => {
    setSendingToApprovals(true);
    try {
      const m = await roadmapToActions(meeting.id);
      setMeeting(m);
      toast.success(`Added ${m.roadmap_actions_added || 0} roadmap task(s) to approvals.`);
      setStep("approval");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not push roadmap tasks.");
    } finally {
      setSendingToApprovals(false);
    }
  };

  const stage = STEP_STAGE[step] ?? 0;

  return (
    <div className="App ad-backdrop min-h-screen">
      <Toaster position="top-right" richColors />
      <Header
        demoMode={demoMode}
        setDemoMode={setDemoMode}
        theme={theme}
        toggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onReset={reset}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <MeetingHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onSelect={handleSelectHistory}
        activeId={meeting?.id}
      />

      {demoMode && (
        <div className="bg-amber-500/15 border-b border-amber-500/25 text-amber-300 text-xs sm:text-sm text-center py-2 px-4 font-mono amber-pulse" data-testid="demo-mode-banner">
          

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <PipelineStepper active={stage} />
        </div>

        {step === "home" && (
          <HomeView onAnalyze={handleIngest} loading={loading} loadingMsg={loadingMsg} />
        )}
        {step === "mapping" && meeting && (
          <SpeakerMappingView meeting={meeting} onConfirm={handleConfirmParticipants} loading={loading} />
        )}
        {step === "analysis" && meeting && (
          <AnalysisView
            meeting={meeting}
            onProceed={() => setStep("approval")}
            onGenerateRoadmap={handleGenerateRoadmap}
            roadmapLoading={roadmapLoading}
            onSendToApprovals={handleSendRoadmapToApprovals}
            sendingToApprovals={sendingToApprovals}
          />
        )}
        {step === "approval" && meeting && (
          <ApprovalView
            meeting={meeting}
            demoMode={demoMode}
            busyIds={busyIds}
            onUpdateAction={updateActionStatus}
            onEditAction={handleEditAction}
            onExecuteAll={handleExecuteAll}
          />
        )}
        {step === "execution" && meeting && (
          <ExecutionView
            meeting={meeting}
            busyIds={busyIds}
            onExecute={runExecute}
            onRetry={runExecute}
            onRestart={reset}
          />
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground font-mono">
        AutoDelegate · MEETING → UNDERSTAND → REASON → PLAN → APPROVE → EXECUTE
      </footer>
    </div>
  );
}

export default App;
