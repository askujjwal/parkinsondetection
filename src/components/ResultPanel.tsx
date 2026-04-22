"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Activity, TrendingUp, Mic, PenTool, Sliders } from "lucide-react";
import type { PredictionResult } from "@/app/page";

function GaugeBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
      <motion.div
        className={`absolute left-0 top-0 h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

const RISK_CONFIG = {
  "Very Low": { icon: CheckCircle2,  bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", bar: "bg-emerald-500" },
  "Low":      { icon: Activity,      bg: "bg-yellow-500/10 border-yellow-500/20",   text: "text-yellow-400",  bar: "bg-yellow-500" },
  "Moderate": { icon: AlertTriangle, bg: "bg-orange-500/10 border-orange-500/20",  text: "text-orange-400",  bar: "bg-orange-500" },
  "High":     { icon: AlertTriangle, bg: "bg-red-500/10 border-red-500/20",         text: "text-red-400",     bar: "bg-red-500" },
};

const INPUT_BADGE: Record<string, { icon: typeof Mic; label: string; color: string }> = {
  voice:       { icon: Sliders, label: "Voice Features",  color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  audio:       { icon: Mic,     label: "Audio Upload",    color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
  handwriting: { icon: PenTool, label: "Spiral Drawing",  color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
};

function SpiralMetrics({ metrics }: { metrics: NonNullable<PredictionResult["spiral_metrics"]> }) {
  const items = [
    { label: "Tremor Score",      value: metrics.tremor_score,       high: true  },
    { label: "Circularity",       value: metrics.circularity,        high: false },
    { label: "Convexity",         value: metrics.convexity,          high: false },
    { label: "Solidity",          value: metrics.solidity,           high: false },
    { label: "Spiral Deviation",  value: metrics.spiral_deviation,   high: true  },
    { label: "Roughness",         value: metrics.roughness,          high: true  },
  ];
  return (
    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <PenTool className="w-4 h-4 text-purple-400" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Spiral Analysis Metrics</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="bg-white/5 rounded-lg p-2.5">
            <p className="text-[10px] text-slate-500 mb-0.5">{item.label}</p>
            <p className={`text-sm font-bold ${item.high ? "text-orange-300" : "text-slate-200"}`}>
              {item.value.toFixed(4)}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-600 mt-3">
        Higher tremor score / deviation → more irregularity in spiral → higher PD likelihood
      </p>
    </div>
  );
}

function AudioFeatures({ features }: { features: NonNullable<PredictionResult["extracted_features"]> }) {
  const groups = [
    {
      title: "Fundamental Frequency",
      items: [
        { key: "MDVP:Fo(Hz)", label: "Fo (Hz)" },
        { key: "MDVP:Fhi(Hz)", label: "Fhi (Hz)" },
        { key: "MDVP:Flo(Hz)", label: "Flo (Hz)" },
      ],
    },
    {
      title: "Jitter (Frequency Variation)",
      items: [
        { key: "MDVP:Jitter(%)", label: "Jitter (%)" },
        { key: "MDVP:Jitter(Abs)", label: "Jitter (Abs)" },
        { key: "MDVP:RAP", label: "RAP" },
        { key: "MDVP:PPQ", label: "PPQ" },
        { key: "Jitter:DDP", label: "DDP" },
      ],
    },
    {
      title: "Shimmer (Amplitude Variation)",
      items: [
        { key: "MDVP:Shimmer", label: "Shimmer" },
        { key: "MDVP:Shimmer(dB)", label: "Shimmer (dB)" },
        { key: "Shimmer:APQ3", label: "APQ3" },
        { key: "Shimmer:APQ5", label: "APQ5" },
        { key: "MDVP:APQ", label: "APQ" },
        { key: "Shimmer:DDA", label: "DDA" },
      ],
    },
    {
      title: "Noise & Harmonics",
      items: [
        { key: "NHR", label: "NHR" },
        { key: "HNR", label: "HNR" },
      ],
    },
    {
      title: "Nonlinear Dynamics",
      items: [
        { key: "RPDE", label: "RPDE" },
        { key: "DFA", label: "DFA" },
        { key: "spread1", label: "spread1" },
        { key: "spread2", label: "spread2" },
        { key: "D2", label: "D2" },
        { key: "PPE", label: "PPE" },
      ],
    },
  ];

  return (
    <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Mic className="w-4 h-4 text-teal-400" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Extracted Voice Features</p>
      </div>
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] text-slate-500 mb-2">{group.title}</p>
            <div className="grid grid-cols-3 gap-2">
              {group.items.map((item) => (
                <div key={item.key} className="bg-white/5 rounded-lg p-2">
                  <p className="text-[9px] text-slate-500 mb-0.5">{item.label}</p>
                  <p className="text-xs font-bold text-slate-200">
                    {features[item.key]?.toFixed(5)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-600 mt-3">
        Features extracted from uploaded audio using Librosa for acoustic analysis
      </p>
    </div>
  );
}

export function ResultPanel({ result }: { result: PredictionResult | null }) {
  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-white/10 bg-white/5 min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-blue-400/60" />
        </div>
        <p className="text-slate-400 text-sm font-medium">No analysis yet</p>
        <p className="text-slate-600 text-xs mt-1">Choose an input method and run the analysis</p>
      </div>
    );
  }

  const cfg      = RISK_CONFIG[result.risk_level as keyof typeof RISK_CONFIG] ?? RISK_CONFIG["High"];
  const Icon     = cfg.icon;
  const detected = result.parkinson_detected;
  const inputType = result.input_type ?? "voice";
  const badge    = INPUT_BADGE[inputType] ?? INPUT_BADGE.voice;
  const BadgeIcon = badge.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={String(result.confidence) + inputType}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        {/* Input type badge */}
        <div className="flex justify-end">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${badge.color}`}>
            <BadgeIcon className="w-3 h-3" />
            {badge.label}
          </span>
        </div>

        {/* Main verdict */}
        <div className={`rounded-2xl border p-5 ${cfg.bg}`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${detected ? "bg-red-500/20" : "bg-emerald-500/20"}`}>
              <Icon className={`w-6 h-6 ${cfg.text}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${cfg.text}`}>
                {detected ? "Parkinson's Detected" : "No Parkinson's Detected"}
              </p>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">{result.recommendation}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-xs text-slate-500 mb-1">Confidence</p>
              <p className={`text-2xl font-bold ${cfg.text}`}>{(result.confidence * 100).toFixed(1)}%</p>
              <GaugeBar value={result.confidence} color={cfg.bar} />
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-xs text-slate-500 mb-1">Risk Level</p>
              <p className={`text-2xl font-bold ${cfg.text}`}>{result.risk_level}</p>
              <p className="text-xs text-slate-600 mt-1">Assessment</p>
            </div>
          </div>
        </div>

        {/* Probability bars */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Probability Breakdown</p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-400">Healthy</span>
                <span className="text-slate-300 font-medium">{(result.probability_healthy * 100).toFixed(1)}%</span>
              </div>
              <GaugeBar value={result.probability_healthy} color="bg-emerald-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-red-400">Parkinson&apos;s</span>
                <span className="text-slate-300 font-medium">{(result.probability_parkinson * 100).toFixed(1)}%</span>
              </div>
              <GaugeBar value={result.probability_parkinson} color="bg-red-500" />
            </div>
          </div>
        </div>

        {/* Spiral-specific metrics */}
        {result.spiral_metrics && <SpiralMetrics metrics={result.spiral_metrics} />}

        {/* Extracted audio features */}
        {result.extracted_features && <AudioFeatures features={result.extracted_features} />}

        {/* Audio duration pill */}
        {result.audio_duration_s !== undefined && (
          <div className="rounded-xl bg-teal-500/5 border border-teal-500/20 px-4 py-2.5 flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 text-teal-400" />
            <p className="text-xs text-teal-300">
              Audio duration: <strong>{result.audio_duration_s}s</strong> · Features extracted with Librosa
            </p>
          </div>
        )}

        {/* Top contributing features */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Contributing Features</p>
          </div>
          <div className="space-y-3">
            {result.top_contributing_features.map((feat, i) => {
              const maxImportance = Math.max(...result.top_contributing_features.map((f) => f.importance));
              const pct = maxImportance > 0 ? feat.importance / maxImportance : 0;
              return (
                <div key={feat.feature}>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-300 font-medium">{feat.feature}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{feat.value}</span>
                      <span className="text-yellow-400 font-medium">{(feat.importance * 100).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-white/10">
                    <motion.div
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-600 mt-3">* SHAP global feature importance from XGBoost training</p>
        </div>

        {/* Disclaimer */}
        <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 px-4 py-3">
          <p className="text-[11px] text-yellow-600">
            <strong className="text-yellow-500">Disclaimer:</strong> Educational tool only. Not a medical diagnosis. Always consult a qualified neurologist.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
