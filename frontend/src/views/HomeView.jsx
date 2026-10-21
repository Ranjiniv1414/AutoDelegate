import { useState } from "react";

export default function HomeView({ onAnalyze, loading, loadingMsg }) {
  const [transcript, setTranscript] = useState("Ravi: The login bug is still there.\nPriya: I'll fix the login bug by Friday.\nArun: I'll test the fix on Saturday.");

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black">
      
      {/* FULL SCREEN BACKGROUND IMAGE - NO DARK OVERLAY ON HER FACE */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/hero.jpg" 
          alt="Hero Background" 
          className="w-full h-full object-cover object-top"
        />
        {/* Gradient only at the very bottom so text is readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex-1 flex flex-col justify-end pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl w-full mx-auto text-center mb-8">
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 tracking-tight drop-shadow-2xl">
            Turn meeting decisions <br/>
            <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              into actions.
            </span>
          </h1>
          <p className="text-lg text-white/80 drop-shadow-lg">
            Upload audio or paste a transcript. AutoDelegate finds who committed to what, by when.
          </p>
        </div>

        {/* INPUT BOX */}
        <div className="w-full max-w-3xl mx-auto bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full h-32 bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:border-indigo-500 transition-colors resize-none mb-4"
            placeholder="Paste your meeting transcript here..."
          />
          <button
            onClick={() => onAnalyze({ mode: "transcript", transcript })}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-lg transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50"
          >
            {loading ? loadingMsg || "Analyzing..." : "✦ Analyze Meeting"}
          </button>
        </div>
      </div>

    </div>
  );
}