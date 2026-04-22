"use client";

import { useState } from "react";
import { Loader2, Zap, RefreshCw, Info, ChevronDown, ChevronUp } from "lucide-react";
import type { PredictionResult, Metadata } from "@/app/page";

const FIELD_GROUPS = [
  {
    label: "Fundamental Frequency",
    color: "blue",
    fields: [
      { key: "mdvp_fo", label: "MDVP:Fo (Hz)", desc: "Average vocal fundamental frequency", min: 80, max: 270, step: 0.001, default: 154.229 },
      { key: "mdvp_fhi", label: "MDVP:Fhi (Hz)", desc: "Maximum vocal fundamental frequency", min: 100, max: 600, step: 0.001, default: 197.105 },
      { key: "mdvp_flo", label: "MDVP:Flo (Hz)", desc: "Minimum vocal fundamental frequency", min: 60, max: 240, step: 0.001, default: 116.325 },
    ],
  },
  {
    label: "Jitter (Frequency Variation)",
    color: "purple",
    fields: [
      { key: "mdvp_jitter_pct", label: "MDVP:Jitter (%)", desc: "Cycle-to-cycle variability (%)", min: 0, max: 0.1, step: 0.00001, default: 0.00662 },
      { key: "mdvp_jitter_abs", label: "MDVP:Jitter (Abs)", desc: "Absolute jitter", min: 0, max: 0.001, step: 0.000001, default: 0.000044 },
      { key: "mdvp_rap", label: "MDVP:RAP", desc: "Relative average perturbation", min: 0, max: 0.06, step: 0.00001, default: 0.00317 },
      { key: "mdvp_ppq", label: "MDVP:PPQ", desc: "5-point period perturbation quotient", min: 0, max: 0.06, step: 0.00001, default: 0.00349 },
      { key: "jitter_ddp", label: "Jitter:DDP", desc: "Average abs difference of differences", min: 0, max: 0.18, step: 0.00001, default: 0.00951 },
    ],
  },
  {
    label: "Shimmer (Amplitude Variation)",
    color: "teal",
    fields: [
      { key: "mdvp_shimmer", label: "MDVP:Shimmer", desc: "Amplitude variation", min: 0, max: 0.2, step: 0.00001, default: 0.02971 },
      { key: "mdvp_shimmer_db", label: "MDVP:Shimmer (dB)", desc: "Shimmer in decibels", min: 0, max: 2, step: 0.001, default: 0.282 },
      { key: "shimmer_apq3", label: "Shimmer:APQ3", desc: "3-point APQ", min: 0, max: 0.1, step: 0.00001, default: 0.01497 },
      { key: "shimmer_apq5", label: "Shimmer:APQ5", desc: "5-point APQ", min: 0, max: 0.15, step: 0.00001, default: 0.01876 },
      { key: "mdvp_apq", label: "MDVP:APQ", desc: "11-point APQ", min: 0, max: 0.15, step: 0.00001, default: 0.02438 },
      { key: "shimmer_dda", label: "Shimmer:DDA", desc: "DDA shimmer", min: 0, max: 0.3, step: 0.00001, default: 0.04491 },
    ],
  },
  {
    label: "Noise & Harmonics",
    color: "orange",
    fields: [
      { key: "nhr", label: "NHR", desc: "Noise-to-harmonic ratio", min: 0, max: 0.5, step: 0.00001, default: 0.02455 },
      { key: "hnr", label: "HNR", desc: "Harmonic-to-noise ratio", min: 0, max: 35, step: 0.001, default: 21.886 },
    ],
  },
  {
    label: "Nonlinear Dynamics",
    color: "rose",
    fields: [
      { key: "rpde", label: "RPDE", desc: "Recurrence period density entropy", min: 0, max: 1, step: 0.000001, default: 0.498536 },
      { key: "dfa", label: "DFA", desc: "Detrended fluctuation analysis", min: 0.5, max: 1, step: 0.000001, default: 0.718099 },
      { key: "spread1", label: "spread1", desc: "Nonlinear fundamental freq variation", min: -8, max: -1, step: 0.000001, default: -5.684397 },
      { key: "spread2", label: "spread2", desc: "Nonlinear fundamental freq variation", min: 0, max: 0.5, step: 0.000001, default: 0.226510 },
      { key: "d2", label: "D2", desc: "Correlation dimension", min: 1, max: 4, step: 0.000001, default: 2.381826 },
      { key: "ppe", label: "PPE", desc: "Pitch period entropy (most predictive)", min: 0, max: 0.7, step: 0.000001, default: 0.371345 },
    ],
  },
];

const SAMPLE_HEALTHY = {
  mdvp_fo: 197.076, mdvp_fhi: 206.896, mdvp_flo: 192.055,
  mdvp_jitter_pct: 0.00289, mdvp_jitter_abs: 0.00001,
  mdvp_rap: 0.00166, mdvp_ppq: 0.00168, jitter_ddp: 0.00498,
  mdvp_shimmer: 0.01098, mdvp_shimmer_db: 0.097,
  shimmer_apq3: 0.00563, shimmer_apq5: 0.0068, mdvp_apq: 0.00802,
  shimmer_dda: 0.01689, nhr: 0.00339, hnr: 26.775,
  rpde: 0.422229, dfa: 0.741367, spread1: -7.3483,
  spread2: 0.177551, d2: 1.743867, ppe: 0.085569,
};

const SAMPLE_PARKINSON = {
  mdvp_fo: 119.992, mdvp_fhi: 157.302, mdvp_flo: 74.997,
  mdvp_jitter_pct: 0.00784, mdvp_jitter_abs: 0.00007,
  mdvp_rap: 0.0037, mdvp_ppq: 0.00554, jitter_ddp: 0.01109,
  mdvp_shimmer: 0.04374, mdvp_shimmer_db: 0.426,
  shimmer_apq3: 0.02182, shimmer_apq5: 0.0313, mdvp_apq: 0.02971,
  shimmer_dda: 0.06545, nhr: 0.02211, hnr: 21.033,
  rpde: 0.414783, dfa: 0.815285, spread1: -4.813031,
  spread2: 0.266482, d2: 2.301442, ppe: 0.284654,
};

type FormValues = Record<string, number>;

const COLOR_MAP: Record<string, string> = {
  blue: "border-blue-500/30 bg-blue-500/5",
  purple: "border-purple-500/30 bg-purple-500/5",
  teal: "border-teal-500/30 bg-teal-500/5",
  orange: "border-orange-500/30 bg-orange-500/5",
  rose: "border-rose-500/30 bg-rose-500/5",
};

const LABEL_MAP: Record<string, string> = {
  blue: "text-blue-400 bg-blue-500/10",
  purple: "text-purple-400 bg-purple-500/10",
  teal: "text-teal-400 bg-teal-500/10",
  orange: "text-orange-400 bg-orange-500/10",
  rose: "text-rose-400 bg-rose-500/10",
};

function buildDefaults(): FormValues {
  const vals: FormValues = {};
  for (const g of FIELD_GROUPS) for (const f of g.fields) vals[f.key] = f.default;
  return vals;
}

export function PredictionForm({
  onResult,
  metadata,
}: {
  onResult: (r: PredictionResult) => void;
  metadata: Metadata | null;
}) {
  const [values, setValues] = useState<FormValues>(buildDefaults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "Fundamental Frequency": true });

  const set = (key: string, val: string) => {
    setValues((p) => ({ ...p, [key]: parseFloat(val) || 0 }));
  };

  const loadSample = (type: "healthy" | "parkinson") => {
    setValues(type === "healthy" ? SAMPLE_HEALTHY : SAMPLE_PARKINSON);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Prediction failed");
      }
      const data = await res.json();
      onResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (label: string) =>
    setExpanded((p) => ({ ...p, [label]: !p[label] }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sample Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Load sample:</span>
        <button
          type="button"
          onClick={() => loadSample("healthy")}
          className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          Healthy Patient
        </button>
        <button
          type="button"
          onClick={() => loadSample("parkinson")}
          className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
        >
          Parkinson&apos;s Patient
        </button>
        <button
          type="button"
          onClick={() => { setValues(buildDefaults()); setError(null); }}
          className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Field Groups */}
      {FIELD_GROUPS.map((group) => (
        <div key={group.label} className={`rounded-xl border ${COLOR_MAP[group.color]} overflow-hidden`}>
          <button
            type="button"
            onClick={() => toggleGroup(group.label)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${LABEL_MAP[group.color]}`}>
              {group.label}
            </span>
            <span className="flex items-center gap-2 text-xs text-slate-500">
              {group.fields.length} features
              {expanded[group.label] ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
          </button>
          {expanded[group.label] && (
            <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {group.fields.map((field) => {
                const isImportant =
                  metadata?.shap_importance &&
                  Object.keys(metadata.shap_importance).indexOf(
                    Object.keys(metadata.shap_importance).find(
                      (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") ===
                        field.label.toLowerCase().replace(/[^a-z0-9]/g, "")
                    ) || ""
                  ) < 5;
                return (
                  <div key={field.key}>
                    <label className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
                      {field.label}
                      {isImportant && (
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" title="High SHAP importance" />
                      )}
                      <span className="ml-auto text-slate-600 truncate max-w-[80px]" title={field.desc}>
                        <Info className="w-2.5 h-2.5 inline" />
                      </span>
                    </label>
                    <input
                      type="number"
                      step={field.step}
                      min={field.min}
                      max={field.max}
                      value={values[field.key] ?? field.default}
                      onChange={(e) => set(field.key, e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                      required
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-blue-500/20"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
        ) : (
          <><Zap className="w-4 h-4" /> Run Analysis</>
        )}
      </button>
    </form>
  );
}
