"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, Upload, Loader2, X, CheckCircle2, Info } from "lucide-react";
import type { PredictionResult } from "@/app/page";

export function AudioUpload({ onResult }: { onResult: (r: PredictionResult) => void }) {
  const [file, setFile]         = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = ".wav,.mp3,.ogg,.flac";

  const handleFile = (f: File) => {
    setError(null);
    setUploaded(false);
    if (!f.name.match(/\.(wav|mp3|ogg|flac)$/i)) {
      setError("Unsupported format. Please upload a WAV, MP3, OGG, or FLAC file.");
      return;
    }
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/predict/audio", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Audio analysis failed");
      }
      const data = await res.json();
      setUploaded(true);
      onResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to analyze audio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
        <div className="flex gap-3">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400 space-y-1">
            <p className="font-medium text-blue-300">How to record your voice sample:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>In a quiet room, sustain the vowel <strong className="text-slate-200">&ldquo;ahhh&rdquo;</strong> for at least <strong className="text-slate-200">3–5 seconds</strong></li>
              <li>Use a good microphone (smartphone or headset works)</li>
              <li>Save as WAV or MP3 and upload below</li>
            </ol>
            <p className="text-slate-500 mt-2">The system extracts Jitter, Shimmer, HNR and 19 other acoustic features automatically.</p>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 p-10 text-center
          ${dragging
            ? "border-blue-400/60 bg-blue-500/10"
            : file
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-white/15 bg-white/5 hover:border-white/25 hover:bg-white/8"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-emerald-300">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
              <Mic className="w-7 h-7 text-blue-400/70" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">Drop your audio file here</p>
              <p className="text-xs text-slate-500 mt-1">or click to browse · WAV, MP3, OGG, FLAC</p>
            </div>
          </div>
        )}
      </div>

      {/* Clear button */}
      {file && (
        <button
          type="button"
          onClick={() => { setFile(null); setError(null); setUploaded(false); }}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Remove file
        </button>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {uploaded && !loading && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Features extracted successfully — see results panel.
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-blue-500/20"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Extracting features &amp; analyzing…</>
        ) : (
          <><Upload className="w-4 h-4" /> Analyze Audio</>
        )}
      </button>
    </div>
  );
}
