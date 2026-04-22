"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Activity, BarChart3, BookOpen, Mic, PenTool, Sliders } from "lucide-react";
import { PredictionForm } from "@/components/PredictionForm";
import { AudioUpload } from "@/components/AudioUpload";
import { HandwritingUpload } from "@/components/HandwritingUpload";
import { ResultPanel } from "@/components/ResultPanel";
import { ModelDashboard } from "@/components/ModelDashboard";
import { HowItWorks } from "@/components/HowItWorks";

export type PredictionResult = {
  parkinson_detected: boolean;
  confidence: number;
  probability_healthy: number;
  probability_parkinson: number;
  risk_level: string;
  top_contributing_features: Array<{ feature: string; value: number; importance: number }>;
  recommendation: string;
  input_type?: string;
  extracted_features?: Record<string, number>;
  spiral_metrics?: {
    circularity: number;
    solidity: number;
    convexity: number;
    spiral_deviation: number;
    roughness: number;
    tremor_score: number;
  };
  audio_duration_s?: number;
};

export type Metadata = {
  feature_names: string[];
  feature_descriptions: Record<string, string>;
  shap_importance: Record<string, number>;
  model_comparison: Record<string, { accuracy: number; recall: number; mcc: number; auc: number }>;
  best_model_by_recall: string;
};

type MainTab = "detect" | "dashboard" | "about";
type DetectMode = "features" | "audio" | "handwriting";

const DETECT_MODES: { id: DetectMode; icon: typeof Mic; label: string; sub: string }[] = [
  { id: "features", icon: Sliders, label: "Voice Features", sub: "Enter 22 acoustic measurements manually" },
  { id: "audio",    icon: Mic,     label: "Audio Upload",   sub: "Upload a WAV/MP3 voice recording" },
  { id: "handwriting", icon: PenTool, label: "Spiral Drawing", sub: "Upload a hand-drawn Archimedean spiral" },
];

export default function Home() {
  const [mainTab, setMainTab]       = useState<MainTab>("detect");
  const [detectMode, setDetectMode] = useState<DetectMode>("features");
  const [result, setResult]         = useState<PredictionResult | null>(null);
  const [metadata, setMetadata]     = useState<Metadata | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metadata")
      .then((r) => r.json())
      .then((d) => setMetadata(d))
      .catch(() => {})
      .finally(() => setMetaLoading(false));
  }, []);

  // Clear result when switching modes
  const handleModeChange = (mode: DetectMode) => {
    setDetectMode(mode);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Multimodal Parkinson&apos;s Detection</h1>
              <p className="text-[11px] text-slate-400">Capstone Project · Voice + Handwriting Analysis</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
            {([
              { id: "detect",    icon: Activity,  label: "Detect" },
              { id: "dashboard", icon: BarChart3,  label: "Model Stats" },
              { id: "about",     icon: BookOpen,   label: "About" },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setMainTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  mainTab === id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">

          {/* ── DETECT TAB ──────────────────────────────────────────────── */}
          {mainTab === "detect" && (
            <motion.div
              key="detect"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              {/* Hero */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/20 rounded-full px-4 py-1.5 text-xs text-blue-300 mb-4">
                  <Brain className="w-3.5 h-3.5" />
                  Multimodal · Voice Acoustics + Spiral Handwriting
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
                  Early Parkinson&apos;s Disease Detection
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
                  Analyze vocal biomarkers or handwriting patterns using machine learning. Choose an input
                  method below — the system extracts digital biomarkers and returns an instant AI-powered assessment.
                </p>
              </div>

              {/* Mode selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {DETECT_MODES.map(({ id, icon: Icon, label, sub }) => (
                  <button
                    key={id}
                    onClick={() => handleModeChange(id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                      detectMode === id
                        ? "border-blue-500/60 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      detectMode === id ? "bg-blue-500/20" : "bg-white/10"
                    }`}>
                      <Icon className={`w-4.5 h-4.5 ${detectMode === id ? "text-blue-400" : "text-slate-400"}`} style={{ width: 18, height: 18 }} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${detectMode === id ? "text-white" : "text-slate-300"}`}>{label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
                    </div>
                    {detectMode === id && (
                      <span className="ml-auto mt-0.5 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Content area */}
              <div className="grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                  <AnimatePresence mode="wait">
                    {detectMode === "features" && (
                      <motion.div key="features" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                        <PredictionForm onResult={setResult} metadata={metadata} />
                      </motion.div>
                    )}
                    {detectMode === "audio" && (
                      <motion.div key="audio" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                        <AudioUpload onResult={setResult} />
                      </motion.div>
                    )}
                    {detectMode === "handwriting" && (
                      <motion.div key="handwriting" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                        <HandwritingUpload onResult={setResult} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="lg:col-span-2">
                  <ResultPanel result={result} />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── DASHBOARD TAB ───────────────────────────────────────────── */}
          {mainTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              <ModelDashboard metadata={metadata} loading={metaLoading} />
            </motion.div>
          )}

          {/* ── ABOUT TAB ───────────────────────────────────────────────── */}
          {mainTab === "about" && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              <HowItWorks />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <footer className="border-t border-white/10 mt-16 py-6 text-center text-xs text-slate-500">
        <p>
          Multimodal Parkinson&apos;s Detection · Capstone Project ·
          Next.js + FastAPI + XGBoost + SHAP ·{" "}
          <span className="text-slate-400">UCI Parkinson&apos;s Dataset</span>
        </p>
        <p className="mt-1 text-slate-600">
          For educational and research purposes only — not a medical diagnostic tool.
        </p>
      </footer>
    </div>
  );
}
