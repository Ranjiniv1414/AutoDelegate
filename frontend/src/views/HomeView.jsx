import { useState } from "react";

export default function HomeView({ onAnalyze, loading, loadingMsg }) {
  const [transcript, setTranscript] = useState("Ravi: The login bug is still there.\nPriya: I'll fix the login bug by Friday.\nArun: I'll test the fix on Saturday.");

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black">
      
      {/* BACKGROUND IMAGE */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/hero.jpg" 
          alt="Hero Background" 
          className="w-full h-full object-cover object-top"
        />
        {/* A softer, deeper gradient starting lower down */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent"></div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex-1 flex flex-col justify-end pb-10 px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-3xl w-full mx-auto text-center mb-6">
          {/* Decreased font size and added a drop shadow */}
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Turn meeting decisions <br/>
            <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent drop-shadow-sm">
              into actions.
            </span>
          </h1>
          {/* Smaller paragraph text */}
          <p className="text-base sm:text-lg text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Upload audio or paste a transcript. AutoDelegate finds who committed to what, by when.
          </p>
        </div>

        {/* INPUT BOX */}
        <div className="w-full max-w-2xl mx-auto bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full h-28 bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm placeholder-white/40 focus:outline-none focus:border-indigo-500 transition-colors resize-none mb-4"
            placeholder="Paste your meeting transcript here..."
          />
          <button
            onClick={() => onAnalyze({ mode: "transcript", transcript })}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50"
          >
            {loading ? loadingMsg || "Analyzing..." : "✦ Analyze Meeting"}
          </button>
        </div>

      </div>
    </div>
  );
}