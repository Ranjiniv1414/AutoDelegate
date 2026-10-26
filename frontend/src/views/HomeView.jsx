import { useState } from "react";

export default function HomeView({ onAnalyze, loading, loadingMsg }) {
  // By changing this to "", the box starts completely empty!
  const [transcript, setTranscript] = useState("");

  return (
    <div className="w-full flex-1 flex flex-col justify-center items-center py-12">
      
      <div className="max-w-3xl lg:max-w-5xl w-full text-center mb-10 lg:mb-16">
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-semibold tracking-wide text-white/40 mix-blend-overlay drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] mb-4 lg:mb-6">
          Turn meeting decisions <br/>
          <span className="bg-gradient-to-r from-indigo-300 to-purple-400 bg-clip-text text-transparent opacity-90 italic">
            into actions.
          </span>
        </h1>
        <p className="text-base sm:text-lg lg:text-2xl text-white/60 tracking-wider font-light max-w-2xl mx-auto">
          Upload audio or paste a transcript. AutoDelegate finds who committed to what, by when.
        </p>
      </div>

      <div className="w-full max-w-2xl lg:max-w-4xl mx-auto bg-white/5 backdrop-blur-lg border border-white/20 rounded-2xl p-6 lg:p-8 shadow-2xl">
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="w-full h-28 lg:h-36 bg-black/20 border border-white/10 rounded-xl p-4 text-white text-sm lg:text-base placeholder-white/40 focus:outline-none focus:border-indigo-400 transition-colors resize-none mb-4"
          placeholder="Paste your meeting transcript here..."
        />
        <button
          onClick={() => onAnalyze({ mode: "transcript", transcript })}
          disabled={loading}
          className="w-full py-3 lg:py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-base lg:text-lg transition-all shadow-lg disabled:opacity-50"
        >
          {loading ? loadingMsg || "Analyzing..." : "✦ Analyze Meeting"}
        </button>
      </div>

    </div>
  );
}