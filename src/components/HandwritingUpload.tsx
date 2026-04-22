"use client";

import { useState, useRef, useCallback } from "react";
import { PenTool, Upload, Loader2, X, CheckCircle2, Info, ImageIcon } from "lucide-react";
import type { PredictionResult } from "@/app/page";

export function HandwritingUpload({ onResult }: { onResult: (r: PredictionResult) => void }) {
  const [file, setFile]         = useState<File | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setError(null);
    setUploaded(false);
    if (!f.name.match(/\.(png|jpg|jpeg|bmp|tiff)$/i)) {
      setError("Unsupported format. Please upload a PNG or JPG image.");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/predict/handwriting", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Image analysis failed");
      }
      const data = await res.json();
      setUploaded(true);
      onResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to analyze image.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { setFile(null); setPreview(null); setError(null); setUploaded(false); };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-4">
        <div className="flex gap-3">
          <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400 space-y-1">
            <p className="font-medium text-purple-300">How to draw the spiral sample:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>On <strong className="text-slate-200">white paper</strong>, draw an <strong className="text-slate-200">Archimedean spiral</strong> (starting from center, expanding outward)</li>
              <li>Draw slowly and naturally — do not rush or trace</li>
              <li>Scan or photograph the drawing on a flat, well-lit surface</li>
              <li>Upload as PNG or JPG below</li>
            </ol>
            <p className="text-slate-500 mt-2">The system analyzes circularity, contour deviation and roughness to detect motor tremors.</p>
          </div>
        </div>
      </div>

      {/* Drop zone / preview */}
      {preview ? (
        <div className="relative rounded-2xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Spiral preview" className="w-full max-h-64 object-contain p-4" />
          <div className="px-4 pb-3 flex items-center justify-between">
            <p className="text-xs text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {file?.name}
            </p>
            <button onClick={clear} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 p-10 text-center
            ${dragging
              ? "border-purple-400/60 bg-purple-500/10"
              : "border-white/15 bg-white/5 hover:border-white/25 hover:bg-white/8"
            }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.bmp,.tiff"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center">
              <PenTool className="w-7 h-7 text-purple-400/70" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">Drop your spiral image here</p>
              <p className="text-xs text-slate-500 mt-1">or click to browse · PNG, JPG, BMP</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {uploaded && !loading && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Spiral analyzed — see results panel for tremor metrics.
        </div>
      )}

      {/* Sample spiral hint */}
      {!file && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
          <ImageIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <p className="text-[11px] text-slate-500">
            Tip: You can find sample Parkinson&apos;s spiral images in the{" "}
            <strong className="text-slate-400">HandPD dataset</strong> (available on Kaggle).
          </p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-purple-500/20"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing spiral drawing…</>
        ) : (
          <><Upload className="w-4 h-4" /> Analyze Handwriting</>
        )}
      </button>
    </div>
  );
}
