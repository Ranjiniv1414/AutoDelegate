import React, { useState } from "react";
import { Users, ArrowRight, Loader2, Info, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const SpeakerMappingView = ({ meeting, onConfirm, loading }) => {
  const [map, setMap] = useState(() =>
    Object.fromEntries((meeting.speakers || []).map((s) => [s, s.match(/^Speaker \d+$/) ? "" : s]))
  );

  const update = (label, value) => setMap((m) => ({ ...m, [label]: value }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Map Speakers to People
        </h2>
        <p className="text-muted-foreground text-sm">
          Assign a real name to each detected speaker. This powers correct ownership of every action item.
        </p>
      </div>

      {meeting.diarization_note && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm" data-testid="diarization-note">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{meeting.diarization_note}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(meeting.speakers || []).map((label, i) => (
          <Card key={label} className="p-4 flex items-center gap-3" data-testid={`speaker-row-${i}`}>
            <div className="h-11 w-11 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-muted-foreground mb-1">{label}</div>
              <Input
                value={map[label] ?? ""}
                onChange={(e) => update(label, e.target.value)}
                placeholder="Enter name (e.g. Ravi)"
                data-testid={`speaker-name-input-${i}`}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Transcript preview */}
      <Card className="p-4">
        <div className="text-xs font-mono text-muted-foreground mb-2">TRANSCRIPT PREVIEW</div>
        <pre className="text-sm whitespace-pre-wrap font-mono max-h-56 overflow-auto text-foreground/90" data-testid="transcript-preview">
{meeting.transcript}
        </pre>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={() => onConfirm(map)} disabled={loading} data-testid="confirm-participants-button">
          {loading ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing meeting…</>
          ) : (
            <>Confirm Participants <ArrowRight className="h-5 w-5" /></>
          )}
        </Button>
      </div>
    </div>
  );
};
