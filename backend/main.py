"""
FastAPI Backend for Multimodal Parkinson's Disease Detection System
Supports: Voice acoustic features (manual), WAV audio upload, Spiral image upload
"""
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib, json, numpy as np, os, io, tempfile, traceback
from fastapi import UploadFile, File, HTTPException

app = FastAPI(
    title="Multimodal Parkinson's Detection API",
    description="ML-powered Parkinson's Disease detection: Voice + Handwriting",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Load model artifacts ─────────────────────────────────────────────────────
BASE = os.path.dirname(__file__)
model  = joblib.load(os.path.join(BASE, "model", "final_model.pkl"))
scaler = joblib.load(os.path.join(BASE, "model", "scaler.pkl"))
with open(os.path.join(BASE, "model", "metadata.json")) as f:
    meta = json.load(f)

FEATURE_NAMES        = meta["feature_names"]
SHAP_IMPORTANCE      = meta["shap_importance"]
FEATURE_DESCRIPTIONS = meta["feature_descriptions"]


# ─── Helpers ──────────────────────────────────────────────────────────────────
def classify(prob_parkinson: float, input_type: str = "voice"):
    if prob_parkinson >= 0.80:
        risk = "High"
    elif prob_parkinson >= 0.50:
        risk = "Moderate"
    elif prob_parkinson >= 0.30:
        risk = "Low"
    else:
        risk = "Very Low"

    detected = prob_parkinson >= 0.50
    recommendation = (
        f"{'Vocal biomarkers' if input_type == 'voice' else 'Handwriting analysis'} suggest possible "
        "Parkinson's indicators. Please consult a neurologist promptly."
        if detected
        else "Results appear within normal range. Continue regular health check-ups."
    )
    return risk, detected, recommendation


def make_response(feature_map, X_scaled, input_type="voice"):
    prediction   = int(model.predict(X_scaled)[0])
    probs        = model.predict_proba(X_scaled)[0]
    prob_healthy = float(probs[0])
    prob_pd      = float(probs[1])

    risk, detected, recommendation = classify(prob_pd, input_type)

    top_features = list(SHAP_IMPORTANCE.keys())[:5]
    top_contributing = [
        {"feature": f, "value": round(feature_map.get(f, 0), 5), "importance": round(SHAP_IMPORTANCE[f], 4)}
        for f in top_features
    ]

    return {
        "parkinson_detected": bool(prediction),
        "confidence": round(max(prob_healthy, prob_pd), 4),
        "probability_healthy": round(prob_healthy, 4),
        "probability_parkinson": round(prob_pd, 4),
        "risk_level": risk,
        "top_contributing_features": top_contributing,
        "recommendation": recommendation,
        "input_type": input_type,
    }


def estimate_spiral_probability(circularity, convexity, solidity, spiral_deviation, roughness):

    import numpy as np

    # Normalize features (0 → normal, 1 → abnormal)
    circ_score = np.clip((0.25 - circularity) / 0.25, 0, 1)
    conv_score = np.clip((0.5 - convexity) / 0.5, 0, 1)
    sol_score  = np.clip((0.95 - solidity) / 0.35, 0, 1)
    dev_score  = np.clip((spiral_deviation - 0.25) / 0.45, 0, 1)
    rough_score= np.clip((roughness - 20.0) / 25.0, 0, 1)

    # Weighted combination (same as yours)
    score = (
        circ_score * 0.17 +
        conv_score * 0.25 +
        sol_score  * 0.20 +
        dev_score  * 0.30 +
        rough_score* 0.10
    )

    # ✅ Fixed sigmoid calibration (balanced & stable)
    prob_pd = 1 / (1 + np.exp(-5.0 * (score - 0.5)))

    # ✅ Scale to avoid extreme values
    prob_pd = 0.05 + 0.90 * prob_pd   # range: 5% → 95%

    return float(np.clip(prob_pd, 0.05, 0.95))

def estimate_audio_probability(feature_map: dict) -> float:
    # Feature scoring (same as before)
    jitter_score = (feature_map.get("MDVP:Jitter(%)", 0) - 0.002) / 0.008
    shimmer_score = (feature_map.get("MDVP:Shimmer", 0) - 0.02) / 0.15
    nhr_score = (feature_map.get("NHR", 0) - 0.005) / 0.15
    hnr_score = (25 - feature_map.get("HNR", 25)) / 20
    ppe_score = (feature_map.get("PPE", 0) - 0.05) / 0.6

    # Combine scores
    combined_score = (
        jitter_score * 0.25 +
        shimmer_score * 0.25 +
        nhr_score * 0.20 +
        hnr_score * 0.15 +
        ppe_score * 0.15
    )

    # Step 1: Normalize safely
    scaled = np.clip((combined_score - 0.3) / 0.7, 0, 1)

    # Step 2: Apply soft sigmoid (less aggressive)
    prob_pd = 1 / (1 + np.exp(-4 * (scaled - 0.5)))

    # Step 3: Avoid extreme 0% or 100%
    prob_pd = 0.05 + 0.90 * prob_pd   # Range: 5% → 95%

    return float(np.clip(prob_pd, 0.05, 0.95))

# ─── Schemas ──────────────────────────────────────────────────────────────────
class VocalFeatures(BaseModel):
    mdvp_fo: float          = Field(..., ge=80,  le=270)
    mdvp_fhi: float         = Field(..., ge=100, le=600)
    mdvp_flo: float         = Field(..., ge=60,  le=240)
    mdvp_jitter_pct: float  = Field(..., ge=0,   le=0.1)
    mdvp_jitter_abs: float  = Field(..., ge=0,   le=0.001)
    mdvp_rap: float         = Field(..., ge=0,   le=0.06)
    mdvp_ppq: float         = Field(..., ge=0,   le=0.06)
    jitter_ddp: float       = Field(..., ge=0,   le=0.18)
    mdvp_shimmer: float     = Field(..., ge=0,   le=0.2)
    mdvp_shimmer_db: float  = Field(..., ge=0,   le=2)
    shimmer_apq3: float     = Field(..., ge=0,   le=0.1)
    shimmer_apq5: float     = Field(..., ge=0,   le=0.15)
    mdvp_apq: float         = Field(..., ge=0,   le=0.15)
    shimmer_dda: float      = Field(..., ge=0,   le=0.3)
    nhr: float              = Field(..., ge=0,   le=0.5)
    hnr: float              = Field(..., ge=0,   le=35)
    rpde: float             = Field(..., ge=0,   le=1)
    dfa: float              = Field(..., ge=0.5, le=1)
    spread1: float          = Field(..., ge=-8,  le=-1)
    spread2: float          = Field(..., ge=0,   le=0.5)
    d2: float               = Field(..., ge=1,   le=4)
    ppe: float              = Field(..., ge=0,   le=0.7)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Multimodal Parkinson's Detection API v3.0", "status": "ready",
            "modules": ["voice_features", "voice_audio", "handwriting"]}


@app.get("/metadata")
def get_metadata():
    return {
        "feature_names": FEATURE_NAMES,
        "feature_descriptions": FEATURE_DESCRIPTIONS,
        "shap_importance": SHAP_IMPORTANCE,
        "model_comparison": meta["model_comparison"],
        "best_model_by_recall": meta["best_model_by_recall"],
    }


# ── Module 1: Manual vocal features ──────────────────────────────────────────
@app.post("/predict")
def predict(features: VocalFeatures):
    feature_map = {
        "MDVP:Fo(Hz)":      features.mdvp_fo,
        "MDVP:Fhi(Hz)":     features.mdvp_fhi,
        "MDVP:Flo(Hz)":     features.mdvp_flo,
        "MDVP:Jitter(%)":   features.mdvp_jitter_pct,
        "MDVP:Jitter(Abs)": features.mdvp_jitter_abs,
        "MDVP:RAP":         features.mdvp_rap,
        "MDVP:PPQ":         features.mdvp_ppq,
        "Jitter:DDP":       features.jitter_ddp,
        "MDVP:Shimmer":     features.mdvp_shimmer,
        "MDVP:Shimmer(dB)": features.mdvp_shimmer_db,
        "Shimmer:APQ3":     features.shimmer_apq3,
        "Shimmer:APQ5":     features.shimmer_apq5,
        "MDVP:APQ":         features.mdvp_apq,
        "Shimmer:DDA":      features.shimmer_dda,
        "NHR":              features.nhr,
        "HNR":              features.hnr,
        "RPDE":             features.rpde,
        "DFA":              features.dfa,
        "spread1":          features.spread1,
        "spread2":          features.spread2,
        "D2":               features.d2,
        "PPE":              features.ppe,
    }
    X = np.array([[feature_map[f] for f in FEATURE_NAMES]])
    return make_response(feature_map, scaler.transform(X), "voice")


# ── Module 2: WAV audio upload ────────────────────────────────────────────────
@app.post("/predict/audio")
async def predict_audio(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".wav", ".mp3", ".ogg", ".flac")):
        raise HTTPException(400, "Unsupported format. Upload a WAV, MP3, OGG or FLAC file.")

    try:
        import librosa
        contents = await file.read()
        with tempfile.NamedTemporaryFile(suffix=os.path.splitext(file.filename)[1], delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        y, sr = librosa.load(tmp_path, sr=None, mono=True)
        os.unlink(tmp_path)

        duration = librosa.get_duration(y=y, sr=sr)
        if duration < 2.0:
            raise HTTPException(400, f"Audio too short ({duration:.1f}s). Need at least 2 seconds of sustained 'ahh' phonation.")

        # ── Extract acoustic features ──────────────────────────────────────
        # Fundamental frequency
        f0, voiced_flag, _ = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
        f0_voiced = f0[voiced_flag] if voiced_flag.any() else np.array([])
        f0_voiced = f0_voiced[~np.isnan(f0_voiced)]

        if len(f0_voiced) < 10:
            raise HTTPException(400, "Could not detect a clear voiced signal. Ensure the audio contains sustained 'ahh' phonation.")

        fo  = float(np.mean(f0_voiced))
        fhi = float(np.percentile(f0_voiced, 97))
        flo = float(np.percentile(f0_voiced, 3))
        # Clamp to training range
        fo  = np.clip(fo,  80,  270)
        fhi = np.clip(fhi, 100, 600)
        flo = np.clip(flo, 60,  240)

        # Jitter (cycle-to-cycle frequency variation)
        periods = 1.0 / f0_voiced
        jitter_pct = float(np.mean(np.abs(np.diff(periods))) / np.mean(periods)) if len(periods) > 1 else 0.005
        jitter_abs = float(np.mean(np.abs(np.diff(periods)))) if len(periods) > 1 else 0.00005
        rap  = jitter_pct * 0.45
        ppq  = jitter_pct * 0.52
        ddp  = rap * 3.0

        # Shimmer (amplitude variation) — from RMS frames
        hop   = 512
        rms   = librosa.feature.rms(y=y, hop_length=hop)[0]
        rms   = rms[rms > 1e-6]
        shimmer = float(np.mean(np.abs(np.diff(rms))) / np.mean(rms)) if len(rms) > 1 else 0.025
        shimmer_db  = float(20 * np.log10(1 + shimmer))
        apq3 = shimmer * 0.50
        apq5 = shimmer * 0.63
        apq  = shimmer * 0.82
        dda  = apq3 * 3.0

        # Noise ratios
        harmonic, percussive = librosa.effects.hpss(y)
        harmonic_energy   = float(np.mean(harmonic ** 2)) + 1e-10
        percussive_energy = float(np.mean(percussive ** 2)) + 1e-10
        hnr_val = float(10 * np.log10(harmonic_energy / percussive_energy))
        nhr_val = float(percussive_energy / harmonic_energy)
        hnr_val = np.clip(hnr_val, 0, 35)
        nhr_val = np.clip(nhr_val, 0, 0.5)

        # Nonlinear dynamics (estimated from autocorrelation / spectral complexity)
        autocorr = librosa.autocorrelate(y, max_size=sr // 4)
        autocorr_norm = autocorr / (autocorr[0] + 1e-10)
        rpde_val = float(np.clip(1.0 - np.abs(autocorr_norm[1]), 0.3, 0.9))
        spectral_flux = float(np.mean(np.abs(np.diff(librosa.feature.melspectrogram(y=y, sr=sr), axis=1))))
        dfa_val  = float(np.clip(0.5 + spectral_flux * 0.5, 0.5, 1.0))

        mfccs   = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        spread1_val = float(np.clip(np.mean(mfccs[1]) * 0.1, -8, -1))
        spread2_val = float(np.clip(np.std(mfccs[2]) * 0.02, 0, 0.5))
        d2_val  = float(np.clip(np.std(mfccs[3]) * 0.5 + 1.5, 1.0, 4.0))
        ppe_val = float(np.clip(np.std(mfccs[0]) * 0.01, 0, 0.7))

        # Clamp all to training ranges
        jitter_pct = float(np.clip(jitter_pct, 0, 0.1))
        jitter_abs = float(np.clip(jitter_abs, 0, 0.001))
        rap        = float(np.clip(rap,  0, 0.06))
        ppq        = float(np.clip(ppq,  0, 0.06))
        ddp        = float(np.clip(ddp,  0, 0.18))
        shimmer    = float(np.clip(shimmer, 0, 0.2))
        shimmer_db = float(np.clip(shimmer_db, 0, 2))
        apq3       = float(np.clip(apq3, 0, 0.1))
        apq5       = float(np.clip(apq5, 0, 0.15))
        apq        = float(np.clip(apq,  0, 0.15))
        dda        = float(np.clip(dda,  0, 0.3))

        feature_map = {
            "MDVP:Fo(Hz)": fo, "MDVP:Fhi(Hz)": fhi, "MDVP:Flo(Hz)": flo,
            "MDVP:Jitter(%)": jitter_pct, "MDVP:Jitter(Abs)": jitter_abs,
            "MDVP:RAP": rap, "MDVP:PPQ": ppq, "Jitter:DDP": ddp,
            "MDVP:Shimmer": shimmer, "MDVP:Shimmer(dB)": shimmer_db,
            "Shimmer:APQ3": apq3, "Shimmer:APQ5": apq5, "MDVP:APQ": apq,
            "Shimmer:DDA": dda, "NHR": nhr_val, "HNR": hnr_val,
            "RPDE": rpde_val, "DFA": dfa_val,
            "spread1": spread1_val, "spread2": spread2_val,
            "D2": d2_val, "PPE": ppe_val,
        }

        # Use your custom probability logic instead of ML model
        prob_pd = estimate_audio_probability(feature_map)
        risk, detected, recommendation = classify(prob_pd, "audio")

# keep top features same
        top_features = list(SHAP_IMPORTANCE.keys())[:5]
        top_contributing = [
            {"feature": f, "value": round(feature_map.get(f, 0), 5), "importance": round(SHAP_IMPORTANCE[f], 4)}
            for f in top_features
        ]

        result = {
            "parkinson_detected": detected,
            "confidence": round(prob_pd, 4),
            "probability_healthy": round(1 - prob_pd, 4),
            "probability_parkinson": round(prob_pd, 4),
            "risk_level": risk,
            "top_contributing_features": top_contributing,
            "recommendation": recommendation,
            "input_type": "audio",
        }
        result["extracted_features"] = {k: round(v, 5) for k, v in feature_map.items()}
        result["audio_duration_s"] = round(duration, 2)
        return result

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Audio processing failed: {str(e)}")


# ── Module 3: Spiral/handwriting image upload ─────────────────────────────────
@app.post("/predict/handwriting")
async def predict_handwriting(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".png", ".jpg", ".jpeg", ".bmp", ".tiff")):
        raise HTTPException(400, "Unsupported format. Upload a PNG or JPG image.")

    try:
        import cv2
        from PIL import Image

        contents = await file.read()
        img_pil  = Image.open(io.BytesIO(contents)).convert("L")  # grayscale
        img_pil  = img_pil.resize((256, 256))
        img_gray = np.array(img_pil, dtype=np.uint8)

        # ── Feature extraction ────────────────────────────────────────────
        # Threshold → binary
        _, binary = cv2.threshold(img_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Contour complexity (tremor proxy)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)

        if not contours:
            raise HTTPException(400, "Could not detect a spiral drawing in the image. Ensure the image contains a hand-drawn spiral on a white background.")

        largest = max(contours, key=cv2.contourArea)
        perimeter   = cv2.arcLength(largest, closed=False)
        area        = cv2.contourArea(largest)
        hull        = cv2.convexHull(largest)
        hull_area   = cv2.contourArea(hull)
        hull_peri   = cv2.arcLength(hull, closed=False)

        # Circularity & convexity (smoothness of spiral — lower = more tremor)
        circularity  = (4 * np.pi * area / (perimeter ** 2 + 1e-6))
        solidity     = area / (hull_area + 1e-6)
        convexity    = hull_peri / (perimeter + 1e-6)

        # Spiral deviation — how far points deviate from smooth arc
        pts = largest.reshape(-1, 2).astype(float)
        centroid = pts.mean(axis=0)
        radii    = np.linalg.norm(pts - centroid, axis=1)
        spiral_deviation = float(np.std(radii) / (np.mean(radii) + 1e-6))

        # Pixel intensity statistics
        ink_pixels      = img_gray[binary > 0]
        mean_intensity  = float(np.mean(ink_pixels)) if len(ink_pixels) > 0 else 128.0
        std_intensity   = float(np.std(ink_pixels))  if len(ink_pixels) > 0 else 30.0

        # HOG-like: gradient magnitudes (roughness)
        grad_x  = cv2.Sobel(img_gray.astype(np.float32), cv2.CV_32F, 1, 0)
        grad_y  = cv2.Sobel(img_gray.astype(np.float32), cv2.CV_32F, 0, 1)
        mag     = np.sqrt(grad_x**2 + grad_y**2)
        roughness = float(np.mean(mag[binary > 0])) if np.any(binary > 0) else float(np.mean(mag))

        # Normalize spiral metrics for a more discriminative tremor score
        circularity_norm = float(np.clip((0.85 - circularity) / 0.4, 0, 1))
        convexity_norm   = float(np.clip((1.0 - convexity) / 0.2, 0, 1))
        solidity_norm    = float(np.clip((1.0 - solidity) / 0.2, 0, 1))
        deviation_norm   = float(np.clip((spiral_deviation - 0.1) / 0.4, 0, 1))
        roughness_norm   = float(np.clip((roughness - 10) / 50, 0, 1))

        tremor_score = float(np.clip(
            circularity_norm * 0.25 +
            convexity_norm   * 0.20 +
            solidity_norm    * 0.15 +
            deviation_norm   * 0.25 +
            roughness_norm   * 0.15,
            0, 1
        ))

        # Map to vocal-equivalent feature vector using heuristics
        # More tremor → higher jitter/shimmer, lower HNR, higher PPE
        feature_map = {
            "MDVP:Fo(Hz)":      float(np.clip(205 - tremor_score * 90 + circularity_norm * 10, 80, 270)),
            "MDVP:Fhi(Hz)":     float(np.clip(225 - tremor_score * 90 + convexity_norm * 10, 100, 600)),
            "MDVP:Flo(Hz)":     float(np.clip(160 - tremor_score * 120 + deviation_norm * 15, 60, 240)),
            "MDVP:Jitter(%)":   float(np.clip(0.0015 + tremor_score * 0.08 + roughness_norm * 0.01, 0, 0.1)),
            "MDVP:Jitter(Abs)": float(np.clip(0.000008 + tremor_score * 0.0008, 0, 0.001)),
            "MDVP:RAP":         float(np.clip(0.0009 + tremor_score * 0.045, 0, 0.06)),
            "MDVP:PPQ":         float(np.clip(0.0010 + tremor_score * 0.045, 0, 0.06)),
            "Jitter:DDP":       float(np.clip(0.0025 + tremor_score * 0.14, 0, 0.18)),
            "MDVP:Shimmer":     float(np.clip(0.008 + tremor_score * 0.18, 0, 0.2)),
            "MDVP:Shimmer(dB)": float(np.clip(0.08 + tremor_score * 1.7, 0, 2)),
            "Shimmer:APQ3":     float(np.clip(0.0045 + tremor_score * 0.08, 0, 0.1)),
            "Shimmer:APQ5":     float(np.clip(0.0055 + tremor_score * 0.105, 0, 0.15)),
            "MDVP:APQ":         float(np.clip(0.007 + tremor_score * 0.12, 0, 0.15)),
            "Shimmer:DDA":      float(np.clip(0.012 + tremor_score * 0.22, 0, 0.3)),
            "NHR":              float(np.clip(0.004 + tremor_score * 0.33, 0, 0.5)),
            "HNR":              float(np.clip(30 - tremor_score * 28 - deviation_norm * 2, 0, 35)),
            "RPDE":             float(np.clip(0.24 + tremor_score * 0.56 + roughness_norm * 0.05, 0, 1)),
            "DFA":              float(np.clip(0.58 + tremor_score * 0.38, 0.5, 1)),
            "spread1":          float(np.clip(-7.2 + tremor_score * 5.2, -8, -1)),
            "spread2":          float(np.clip(0.045 + tremor_score * 0.44, 0, 0.5)),
            "D2":               float(np.clip(1.45 + tremor_score * 2.1, 1, 4)),
            "PPE":              float(np.clip(0.045 + tremor_score * 0.6, 0, 0.7)),
        }

        # Use spiral-based probability
        prob_pd = estimate_spiral_probability(
            circularity, convexity, solidity, spiral_deviation, roughness
        )

        risk, detected, recommendation = classify(prob_pd, "handwriting")

        top_features = list(SHAP_IMPORTANCE.keys())[:5]
        top_contributing = [
            {"feature": f, "value": round(feature_map.get(f, 0), 5), "importance": round(SHAP_IMPORTANCE[f], 4)}
            for f in top_features
        ]

        result = {
            "parkinson_detected": detected,
            "confidence": round(prob_pd, 4),
            "probability_healthy": round(1 - prob_pd, 4),
            "probability_parkinson": round(prob_pd, 4),
            "risk_level": risk,
            "top_contributing_features": top_contributing,
            "recommendation": recommendation,
            "input_type": "handwriting",
        }
        result["spiral_metrics"] = {
            "circularity":       round(circularity,       4),
            "solidity":          round(solidity,          4),
            "convexity":         round(convexity,         4),
            "spiral_deviation":  round(spiral_deviation,  4),
            "roughness":         round(roughness,         4),
            "tremor_score":      round(tremor_score,      4),
        }
        return result

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Image processing failed: {str(e)}")


@app.get("/sample-data")
def sample_data():
    return {
        "healthy": {
            "mdvp_fo": 197.076, "mdvp_fhi": 206.896, "mdvp_flo": 192.055,
            "mdvp_jitter_pct": 0.00289, "mdvp_jitter_abs": 0.00001,
            "mdvp_rap": 0.00166, "mdvp_ppq": 0.00168, "jitter_ddp": 0.00498,
            "mdvp_shimmer": 0.01098, "mdvp_shimmer_db": 0.097,
            "shimmer_apq3": 0.00563, "shimmer_apq5": 0.0068, "mdvp_apq": 0.00802,
            "shimmer_dda": 0.01689, "nhr": 0.00339, "hnr": 26.775,
            "rpde": 0.422229, "dfa": 0.741367, "spread1": -7.3483,
            "spread2": 0.177551, "d2": 1.743867, "ppe": 0.085569
        },
        "parkinson": {
            "mdvp_fo": 119.992, "mdvp_fhi": 157.302, "mdvp_flo": 74.997,
            "mdvp_jitter_pct": 0.00784, "mdvp_jitter_abs": 0.00007,
            "mdvp_rap": 0.0037, "mdvp_ppq": 0.00554, "jitter_ddp": 0.01109,
            "mdvp_shimmer": 0.04374, "mdvp_shimmer_db": 0.426,
            "shimmer_apq3": 0.02182, "shimmer_apq5": 0.0313, "mdvp_apq": 0.02971,
            "shimmer_dda": 0.06545, "nhr": 0.02211, "hnr": 21.033,
            "rpde": 0.414783, "dfa": 0.815285, "spread1": -4.813031,
            "spread2": 0.266482, "d2": 2.301442, "ppe": 0.284654
        }
    }
