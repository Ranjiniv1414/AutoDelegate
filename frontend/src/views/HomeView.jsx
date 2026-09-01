import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, ClipboardPaste, Sparkles, FileAudio, Loader2, X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SAMPLE_MEETINGS } from "@/data/samples";
import { cn } from "@/lib/utils";

export const HomeView = ({ onAnalyze, loading, loadingMsg }) => {
  const [mode, setMode] = useState("transcript");
  const [transcript, setTranscript] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const fileRef = useRef(null);

  const canAnalyze = mode === "transcript" ? transcript.trim().length > 0 : !!audioFile;

  const handleFile = (f) => {
    if (f) setAudioFile(f);
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent border border-primary/20 text-xs font-mono text-accent-foreground"
        >
          <Sparkles className="h-3 w-3" /> AGENTIC MEETING INTELLIGENCE
        </motion.div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
          Turn meeting decisions <br className="hidden sm:block" />
          <span className="text-primary">into actions.</span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
          Upload audio or paste a transcript. AutoDelegate finds who committed to what, by when —
          then drafts the Jira tickets, emails and calendar invites for your approval.
        </p>
      </div>

      {/* Ingestion card */}
      <Card className="max-w-3xl mx-auto p-6 sm:p-8 glass fade-up" data-testid="ingestion-card">
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="transcript" data-testid="tab-transcript">
              <ClipboardPaste className="h-4 w-4 mr-2" /> Paste Transcript
            </TabsTrigger>
            <TabsTrigger value="audio" data-testid="tab-audio">
              <FileAudio className="h-4 w-4 mr-2" /> Upload Audio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="space-y-4">
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={"Ravi: The login bug is still there.\nPriya: I'll fix the login bug by Friday.\nArun: I'll test the fix on Saturday."}
              className="min-h-[200px] font-mono text-sm resize-y"
              data-testid="transcript-input"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">Try a sample:</span>
              {SAMPLE_MEETINGS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setTranscript(s.transcript)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-border hover:border-primary/50 hover:bg-accent transition-colors"
                  data-testid={`sample-btn-${i}`}
                >
                  <Wand2 className="h-3 w-3" /> {s.title}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="audio" className="space-y-4">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/40 transition-colors"
              data-testid="audio-dropzone"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".mp3,.wav,.m4a,.webm,.mp4,.mpeg,.mpga"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
                data-testid="audio-file-input"
              />
              {audioFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileAudio className="h-6 w-6 text-primary" />
                  <span className="font-medium">{audioFile.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setAudioFile(null); }}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="clear-audio-button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="font-medium">Drop audio here or click to browse</p>
                  <p className="text-xs text-muted-foreground">mp3, wav, m4a, webm · max 25MB · transcribed with Whisper</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Button
          size="lg"
          className="w-full mt-6 h-12 text-base"
          disabled={!canAnalyze || loading}
          onClick={() => onAnalyze({ mode, transcript, audioFile })}
          data-testid="analyze-meeting-button"
        >
          {loading ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> {loadingMsg || "Processing…"}</>
          ) : (
            <><Sparkles className="h-5 w-5" /> Analyze Meeting</>
          )}
        </Button>
      </Card>
    </div>
  );
};
