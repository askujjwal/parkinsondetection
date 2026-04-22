"use client";

import { Loader2, Trophy, Target, BarChart3 } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import type { Metadata } from "@/app/page";

const METRIC_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export function ModelDashboard({ metadata, loading }: { metadata: Metadata | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="text-center py-24 text-slate-500">
        Could not load model metadata. Make sure the backend is running.
      </div>
    );
  }

  const { model_comparison, best_model_by_recall, shap_importance } = metadata;

  // Build comparison table data
  const modelRows = Object.entries(model_comparison).map(([name, metrics]) => ({
    name,
    ...metrics,
    isBest: name === best_model_by_recall,
  }));

  // SHAP bar chart data (top 10)
  const shapData = Object.entries(shap_importance)
    .slice(0, 10)
    .map(([name, val]) => ({ name, importance: parseFloat((val as number).toFixed(4)) }));

  // Radar chart: best model metrics
  const bestMetrics = model_comparison[best_model_by_recall];
  const radarData = bestMetrics
    ? [
        { metric: "Accuracy", value: parseFloat((bestMetrics.accuracy * 100).toFixed(1)) },
        { metric: "Recall", value: parseFloat((bestMetrics.recall * 100).toFixed(1)) },
        { metric: "MCC×100", value: parseFloat((bestMetrics.mcc * 100).toFixed(1)) },
        { metric: "AUC", value: parseFloat((bestMetrics.auc * 100).toFixed(1)) },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Model Performance Dashboard</h2>
        <p className="text-slate-400 text-sm">
          5-fold GroupKFold cross-validation — no patient data leakage · SMOTE balancing
        </p>
      </div>

      {/* Best model callout */}
      {bestMetrics && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-yellow-300">
              Best Model by Recall: <span className="text-white">{best_model_by_recall}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Recall is the priority metric for medical screening — minimizing missed Parkinson&apos;s cases (false negatives).
            </p>
            <div className="flex gap-4 mt-3 flex-wrap">
              {(["accuracy", "recall", "mcc", "auc"] as const).map((m) => (
                <div key={m}>
                  <p className="text-[10px] text-slate-500 uppercase">{m}</p>
                  <p className="text-sm font-bold text-white">{(bestMetrics[m] * 100).toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Dataset Samples" value="195" sub="UCI Parkinson's" color="border-blue-500/20 bg-blue-500/5" />
        <StatCard label="Features" value="22" sub="Vocal biomarkers" color="border-purple-500/20 bg-purple-500/5" />
        <StatCard label="Models Compared" value={String(modelRows.length)} sub="GroupKFold-5" color="border-teal-500/20 bg-teal-500/5" />
        <StatCard label="Final Model" value="XGBoost" sub="+ SMOTE + SHAP" color="border-orange-500/20 bg-orange-500/5" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* SHAP Importance Bar Chart */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <p className="text-sm font-semibold text-white">SHAP Feature Importance (Top 10)</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={shapData} layout="vertical" margin={{ left: 12, right: 12 }}>
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e2e8f0" }}
                itemStyle={{ color: "#93c5fd" }}
              />
              <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                {shapData.map((_, i) => (
                  <Cell key={i} fill={METRIC_COLORS[i % METRIC_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-purple-400" />
            <p className="text-sm font-semibold text-white">Best Model — Metrics Radar</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Radar
                name={best_model_by_recall}
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.25}
                dot={{ fill: "#3b82f6", r: 4 }}
              />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: "#93c5fd" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Comparison Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 overflow-x-auto">
        <p className="text-sm font-semibold text-white mb-4">Model Comparison (CV Averages)</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              {["Model", "Accuracy", "Recall ↑", "MCC", "AUC"].map((h) => (
                <th key={h} className="text-left py-2 px-3 text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modelRows.map((row) => (
              <tr
                key={row.name}
                className={`border-b border-white/5 transition-colors ${row.isBest ? "bg-yellow-500/5" : "hover:bg-white/5"}`}
              >
                <td className="py-2.5 px-3 font-medium text-slate-300 flex items-center gap-2">
                  {row.isBest && <span className="text-yellow-400">★</span>}
                  {row.name}
                </td>
                <td className="py-2.5 px-3 text-slate-400">{(row.accuracy * 100).toFixed(1)}%</td>
                <td className={`py-2.5 px-3 font-semibold ${row.isBest ? "text-yellow-400" : "text-slate-400"}`}>
                  {(row.recall * 100).toFixed(1)}%
                </td>
                <td className="py-2.5 px-3 text-slate-400">{(row.mcc * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-slate-400">{(row.auc * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-slate-600 mt-3">
          ↑ Recall is the primary metric — in medical screening, false negatives are more dangerous than false positives.
        </p>
      </div>
    </div>
  );
}
