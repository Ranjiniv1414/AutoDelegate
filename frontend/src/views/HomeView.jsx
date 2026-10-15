import { useState } from "react";

export default function HomeView({ onAnalyze, loading, loadingMsg }) {
  const [mode, setMode] = useState("transcript");
  const [transcript, setTranscript] = useState(
    "Ravi: The login bug is still there.\nPriya: I'll fix the login bug by Friday.\nArun: I'll test the fix on Saturday."
  );
  const [audioFile, setAudioFile] = useState(null);

  const handleSubmit = () => {
    if (mode === "transcript") {
      onAnalyze({ mode: "transcript", transcript });
    } else {
      onAnalyze({ mode: "audio", audioFile });
    }
  };

  const samples = {
    "Login Bug Standup": "Ravi: The login bug is still there.\nPriya: I'll fix the login bug by Friday.\nArun: I'll test the fix on Saturday.",
    "Product Sync": "Sarah: Thanks everyone for joining. Let's finalize the product launch plan.\nMike: I can put together the full marketing budget breakdown by Wednesday.\nPriya: I'll draft the launch announcement email and send it by Friday.\nSarah: Great, let's lock in October 15th as the official launch date.",
  };

  return (
    <div className="space-y-8">
      {/* ============ CINEMATIC HERO ============ */}
      <div className="hero-cinematic relative w-full overflow-hidden rounded-3xl border border-white/10">
        {/* Background Image */}
        <div className="hero-image-wrap absolute inset-0">
          <img
            src="/hero.jpg"
            alt="AI Meeting Agent"
            className="hero-image w-full h-full object-cover"
          />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/95"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent"></div>

        {/* Content */}
        <div className="relative z-10 px-6 py-16 sm:px-10 sm:py-24 lg:px-16 lg:py-32 max-w-4xl">
          <div className="hero-reveal hero-reveal-1 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 backdrop-blur-md">
            <span className="text-xs sm:text-sm text-white/90 tracking-wider">✦ AGENTIC MEETING INTELLIGENCE</span>
          </div>

          <h1 className="hero-reveal hero-reveal-2 mt-6 text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
            Turn meeting decisions
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              into actions.
            </span>
          </h1>

          <p className="hero-reveal hero-reveal-3 mt-6 max-w-2xl text-base sm:text-lg text-white/70 leading-relaxed">
            Upload audio or paste a transcript. AutoDelegate finds who committed
            to what, by when — then drafts the Jira tickets, emails and calendar
            invites for your approval.
          </p>
        </div>

        {/* Bottom Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none"></div>
      </div>

      {/* ============ TRANSCRIPT INPUT CARD ============ */}
      <div className="hero-reveal hero-reveal-4 relative z-10 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-6 sm:p-8">
        {/* Mode Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode("transcript")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm sm:text-base transition-all ${
              mode === "transcript"
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            📝 Paste Transcript
          </button>
          <button
            onClick={() => setMode("audio")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm sm:text-base transition-all ${
              mode === "audio"
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            🎙️ Upload Audio
          </button>
        </div>

        {/* Transcript Input */}
        {mode === "transcript" && (
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your meeting transcript here..."
            className="w-full h-40 sm:h-48 rounded-xl border border-white/10 bg-black/40 p-4 text-white/90 text-sm font-mono resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        )}

        {mode === "audio" && (
          <div className="w-full h-40 sm:h-48 rounded-xl border border-white/10 border-dashed bg-black/40 flex flex-col items-center justify-center text-white/50 text-sm">
            <p>🎵 Audio upload coming soon</p>
            <p className="mt-2 text-xs">Use "Paste Transcript" for now</p>
          </div>
        )}

        {/* Sample Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-xs text-white/40">Try a sample:</span>
          {Object.keys(samples).map((name) => (
            <button
              key={name}
              onClick={() => {
                setMode("transcript");
                setTranscript(samples[name]);
              }}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white/70 transition-all"
            >
              ⚡ {name}
            </button>
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/30"
        >
          {loading ? (
            <>
              <span className="animate-spin">⟳</span>
              {loadingMsg || "Analyzing..."}
            </>
          ) : (
            <>✦ Analyze Meeting</>
          )}
        </button>
      </div>
    </div>
  );
}