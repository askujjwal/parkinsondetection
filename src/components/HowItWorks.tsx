"use client";

import { Brain, Mic, FlaskConical, BarChart3, ShieldAlert, Database, PenTool, Users, FileBarChart } from "lucide-react";

const PIPELINE_VOICE = [
  {
    icon: Mic,
    color: "blue",
    title: "Voice Recording",
    desc: "Patient sustains the vowel 'ahhh' for 3–5 seconds. A microphone captures the phonation. The system extracts 22 vocal biomarkers including Jitter, Shimmer, HNR, RPDE, DFA, and PPE using Librosa.",
  },
  {
    icon: Database,
    color: "purple",
    title: "UCI Parkinson's Dataset",
    desc: "Model trained on 195 voice samples from 31 patients (23 PD, 8 healthy) from Oxford's Biomedical Voice Database. GroupKFold cross-validation prevents patient-level data leakage.",
  },
  {
    icon: FlaskConical,
    color: "teal",
    title: "SMOTE Class Balancing",
    desc: "The dataset has a 3:1 PD-to-healthy imbalance. Synthetic Minority Over-sampling Technique (SMOTE) generates synthetic healthy samples to improve model fairness and reduce bias.",
  },
  {
    icon: Brain,
    color: "orange",
    title: "XGBoost Classification",
    desc: "Gradient boosted trees selected as the final model after comparing Logistic Regression, SVM, Random Forest, and Gradient Boosting. Achieves >90% accuracy and >85% recall.",
  },
  {
    icon: BarChart3,
    color: "rose",
    title: "SHAP Explainability (XAI)",
    desc: "SHapley Additive exPlanations (SHAP) quantify each feature's contribution per prediction. PPE (Pitch Period Entropy) and spread1 are consistently the most predictive features.",
  },
];

const PIPELINE_HANDWRITING = [
  {
    icon: PenTool,
    color: "purple",
    title: "Spiral Drawing Upload",
    desc: "Patient draws an Archimedean spiral on white paper. The image is scanned or photographed and uploaded to the system.",
  },
  {
    icon: Brain,
    color: "teal",
    title: "Image Preprocessing",
    desc: "The image is converted to grayscale, resized to 256×256, and binarized using Otsu thresholding to isolate the spiral contour from the background.",
  },
  {
    icon: BarChart3,
    color: "orange",
    title: "Feature Extraction (CV)",
    desc: "OpenCV extracts contour-based features: circularity, convexity, solidity, spiral deviation, and gradient roughness (HOG-like). These quantify motor tremors and micrographia.",
  },
  {
    icon: Brain,
    color: "rose",
    title: "Tremor Score → Prediction",
    desc: "A composite tremor score is derived from contour irregularity and maps to vocal-equivalent features. The same XGBoost model then classifies the sample.",
  },
];

const COLOR_MAP: Record<string, { border: string; bg: string; icon: string }> = {
  blue:   { border: "border-blue-500/30",   bg: "bg-blue-500/10",   icon: "text-blue-400"   },
  purple: { border: "border-purple-500/30", bg: "bg-purple-500/10", icon: "text-purple-400" },
  teal:   { border: "border-teal-500/30",   bg: "bg-teal-500/10",   icon: "text-teal-400"   },
  orange: { border: "border-orange-500/30", bg: "bg-orange-500/10", icon: "text-orange-400" },
  rose:   { border: "border-rose-500/30",   bg: "bg-rose-500/10",   icon: "text-rose-400"   },
  yellow: { border: "border-yellow-500/30", bg: "bg-yellow-500/10", icon: "text-yellow-400" },
};

function PipelineList({ steps, label, color }: { steps: typeof PIPELINE_VOICE; label: string; color: string }) {
  const cfg = COLOR_MAP[color];
  return (
    <div>
      <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-4 ${cfg.bg} ${cfg.icon} border ${cfg.border}`}>
        {label}
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const c = COLOR_MAP[step.color];
          const Icon = step.icon;
          return (
            <div key={step.title} className={`flex gap-4 rounded-xl border p-4 ${c.border} bg-white/5`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                <Icon className={`w-4.5 h-4.5 ${c.icon}`} style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${c.bg} ${c.icon}`}>
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const USER_ROLES = [
  {
    icon: Users,
    color: "blue",
    title: "Patient (End User)",
    skills: "Low to Medium technical skill",
    needs: ["Simple UI with large, clear buttons", "Clear Positive / Negative result display", "Privacy and data protection", "Access to own test history"],
  },
  {
    icon: Brain,
    color: "purple",
    title: "Clinician / Doctor",
    skills: "High domain knowledge",
    needs: ["Sensitivity & Specificity metrics", "SHAP feature breakdown (Why PD?)", "Longitudinal test history per patient", "Export of prediction reports (PDF)"],
  },
];

const FEATURES_GLOSSARY = [
  { group: "Fundamental Frequency", features: ["MDVP:Fo(Hz)", "MDVP:Fhi(Hz)", "MDVP:Flo(Hz)"], color: "blue", desc: "Average, max, and min vocal pitch frequency" },
  { group: "Jitter (Freq. Variation)", features: ["MDVP:Jitter(%)", "MDVP:Jitter(Abs)", "MDVP:RAP", "MDVP:PPQ", "Jitter:DDP"], color: "purple", desc: "Cycle-to-cycle frequency instability" },
  { group: "Shimmer (Amp. Variation)", features: ["MDVP:Shimmer", "MDVP:Shimmer(dB)", "Shimmer:APQ3", "Shimmer:APQ5", "MDVP:APQ", "Shimmer:DDA"], color: "teal", desc: "Amplitude instability of vocal folds" },
  { group: "Noise Ratios", features: ["NHR", "HNR"], color: "orange", desc: "Noise-to-harmonic and harmonic-to-noise ratios" },
  { group: "Nonlinear Dynamics", features: ["RPDE", "DFA", "spread1", "spread2", "D2", "PPE"], color: "rose", desc: "Nonlinear complexity of the vocal signal" },
];

export function HowItWorks() {
  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Multimodal Parkinson&apos;s Detection — How It Works</h2>
        <p className="text-slate-400 text-sm max-w-3xl">
          The system combines two non-invasive digital biomarker modalities — voice acoustics and spiral handwriting —
          to screen for Parkinson&apos;s Disease. Both pipelines feed into the same XGBoost classification engine.
        </p>
      </div>

      {/* System Architecture */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-5">System Architecture (3-Layer)</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { layer: "Presentation Layer", tech: "Next.js 15 Frontend", desc: "File uploads, real-time feedback, result visualization, charts", color: "blue" },
            { layer: "Application Layer", tech: "FastAPI Backend", desc: "Audio preprocessing (Librosa), image processing (OpenCV), ML inference, SHAP", color: "teal" },
            { layer: "Data Layer", tech: "SQLite / Records", desc: "User profiles, test history, raw data paths, timestamps", color: "purple" },
          ].map((item) => {
            const c = COLOR_MAP[item.color];
            return (
              <div key={item.layer} className={`rounded-xl p-4 border ${c.border} ${c.bg}`}>
                <p className={`text-[10px] font-bold uppercase mb-1 ${c.icon}`}>{item.layer}</p>
                <p className="text-sm font-semibold text-white mb-2">{item.tech}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dual pipeline */}
      <div className="grid md:grid-cols-2 gap-8">
        <PipelineList steps={PIPELINE_VOICE}       label="Voice Analysis Module"       color="blue"   />
        <PipelineList steps={PIPELINE_HANDWRITING} label="Handwriting Analysis Module" color="purple" />
      </div>

      {/* User Roles */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">User Roles</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {USER_ROLES.map((role) => {
            const c = COLOR_MAP[role.color];
            const Icon = role.icon;
            return (
              <div key={role.title} className={`rounded-2xl border p-5 ${c.border} bg-white/5`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg}`}>
                    <Icon className={`w-4.5 h-4.5 ${c.icon}`} style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{role.title}</p>
                    <p className={`text-[10px] ${c.icon}`}>{role.skills}</p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {role.needs.map((n) => (
                    <li key={n} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.bg.replace("/10", "/60")}`} />
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Glossary */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Voice Feature Glossary</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {FEATURES_GLOSSARY.map((group) => {
            const c = COLOR_MAP[group.color];
            return (
              <div key={group.group} className={`rounded-xl border p-4 ${c.border} bg-white/5`}>
                <p className={`text-xs font-semibold mb-0.5 ${c.icon}`}>{group.group}</p>
                <p className="text-[11px] text-slate-500 mb-3">{group.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.features.map((f) => (
                    <span key={f} className={`text-[11px] px-2 py-0.5 rounded-md ${c.bg} text-slate-300`}>{f}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Functional Requirements */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Key Requirements (from Project Report)</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { label: "Accuracy",      req: "Model Recall ≥ 85% to minimize false negatives",              color: "rose",   icon: BarChart3 },
            { label: "Performance",   req: "Prediction response time ≤ 5 seconds under normal load",      color: "teal",   icon: FlaskConical },
            { label: "Input Support", req: "WAV audio (≥ 3s) and PNG/JPG spiral images",                  color: "blue",   icon: Mic },
            { label: "Explainability",req: "SHAP/LIME feature attribution for every prediction",          color: "purple", icon: Brain },
            { label: "History",       req: "Test results saved per user for longitudinal tracking",       color: "orange", icon: FileBarChart },
            { label: "Disclaimer",    req: "Screening probability only — NOT a medical prescription",     color: "yellow", icon: ShieldAlert },
          ].map((item) => {
            const c = COLOR_MAP[item.color];
            const Icon = item.icon;
            return (
              <div key={item.label} className={`flex gap-3 rounded-xl border p-3.5 ${c.border} bg-white/5`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                  <Icon className={`w-4 h-4 ${c.icon}`} />
                </div>
                <div>
                  <p className={`text-xs font-semibold ${c.icon}`}>{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.req}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Tech Stack</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Frontend",       tech: "Next.js 15 + React 19",        color: "blue"   },
            { label: "Backend",        tech: "FastAPI + Uvicorn",             color: "teal"   },
            { label: "Voice ML",       tech: "XGBoost + scikit-learn",        color: "purple" },
            { label: "Explainability", tech: "SHAP TreeExplainer",            color: "orange" },
            { label: "Audio Extract",  tech: "Librosa (Jitter/Shimmer/HNR)",  color: "rose"   },
            { label: "Image CV",       tech: "OpenCV (contour analysis)",     color: "yellow" },
            { label: "Balancing",      tech: "SMOTE (imbalanced-learn)",      color: "blue"   },
            { label: "Dataset",        tech: "UCI Parkinson's + HandPD",      color: "purple" },
          ].map((item) => {
            const c = COLOR_MAP[item.color];
            return (
              <div key={item.label} className={`rounded-lg p-3 ${c.bg} border ${c.border}`}>
                <p className={`text-[10px] font-semibold uppercase ${c.icon} mb-1`}>{item.label}</p>
                <p className="text-xs text-slate-300">{item.tech}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
