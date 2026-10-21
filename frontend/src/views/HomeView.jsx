import { useState } from "react";

export default function HomeView({ onAnalyze, loading, loadingMsg }) {
  const [transcript, setTranscript] = useState("Ravi: The login bug is still there.\nPriya: I'll fix the login bug by Friday.\nArun: I'll test the fix on Saturday.");

  return (
    <div style={{ paddingBottom: "40px" }}>
      
      {/* HERO IMAGE */}
      <div style={{ position: "relative", width: "100%", height: "400px", borderRadius: "24px", overflow: "hidden", marginBottom: "24px" }}>
        <img src="/hero.jpg" alt="Hero" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0a0a0f, transparent)" }}></div>
        <div style={{ position: "absolute", bottom: "40px", left: "24px", right: "24px" }}>
          <h1 style={{ fontSize: "36px", fontWeight: "bold", color: "white", lineHeight: "1.2" }}>
            Turn meeting decisions <br/>
            <span style={{ color: "#818cf8" }}>into actions.</span>
          </h1>
        </div>
      </div>

      {/* INPUT BOX */}
      <div style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)", padding: "24px" }}>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          style={{ width: "100%", height: "150px", borderRadius: "12px", background: "black", color: "white", padding: "16px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "16px" }}
        />
        <button
          onClick={() => onAnalyze({ mode: "transcript", transcript })}
          disabled={loading}
          style={{ width: "100%", padding: "16px", borderRadius: "12px", background: "#4f46e5", color: "white", fontWeight: "bold", cursor: "pointer" }}
        >
          {loading ? loadingMsg || "Analyzing..." : "✦ Analyze Meeting"}
        </button>
      </div>

    </div>
  );
}