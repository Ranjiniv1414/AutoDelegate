import { useState } from "react";

export default function HomeView({ onAnalyze, loading, loadingMsg }) {
  const [transcript, setTranscript] = useState("Ravi: The login bug is still there.\nPriya: I'll fix the login bug by Friday.\nArun: I'll test the fix on Saturday.");

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black font-[Poppins,Quicksand,sans-serif]">
      
      {/* CSS FOR THE WIND/MOVEMENT EFFECT */}
      <style>{`
        .wind-motion {
          animation: windBlow 8s ease-in-out infinite alternate;
          transform-origin: center center;
        }
        @keyframes windBlow {
          0% { transform: scale(1) translateX(0px) rotate(0deg); }
          50% { transform: scale(1.03) translateX(-5px) rotate(0.5deg); }
          100% { transform: scale(1.05) translateX(5px) rotate(-0.5deg); }
        }
      `}</style>

      {/* FULL IMAGE WITH WIND EFFECT */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/hero.jpg" 
          alt="Hero Background" 
          className="wind-motion w-full h-full object-cover object-center"
        />
      </div>

      {/* OVERLAY CONTENT */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 w-full">
        
        {/* Main Text */}
        <div className="max-w-2xl w-full text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-wide text-white/30 mix-blend-overlay drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] mb-4">
            Turn meeting decisions <br/>
            <span className="bg-gradient-to-r from-indigo-300 to-purple-400 bg-clip-text text-transparent opacity-80 italic">
              into actions.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-white/50 tracking-wider font-light">
            Upload audio or paste a transcript. AutoDelegate finds who committed to what, by when.
          </p>
        </div>

        {/* TRANSPARENT GLASS INPUT BOX */}
        <div className="w-full max-w-2xl mx-auto bg-white/5 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-2xl">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full h-28 bg-black/20 border border-white/10 rounded-xl p-4 text-white text-sm placeholder-white/40 focus:outline-none focus:border-indigo-400 transition-colors resize-none mb-4"
            placeholder="Paste your meeting transcript here..."
          />
          <button
            onClick={() => onAnalyze({ mode: "transcript", transcript })}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-base transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? loadingMsg || "Analyzing..." : "✦ Analyze Meeting"}
          </button>
        </div>

      </div>
    </div>
  );
}