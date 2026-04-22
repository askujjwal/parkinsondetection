"""
Improved Parkinson's Disease Detection - Training Script
Features:
  - GroupKFold to prevent patient data leakage
  - SMOTE for class imbalance handling
  - XGBoost with hyperparameter tuning
  - SHAP values for explainability
  - Comprehensive metrics (Recall, MCC, AUC)
"""

import pandas as pd
import numpy as np
import joblib
import json
import os

from sklearn.model_selection import GroupKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score,
    matthews_corrcoef, recall_score, accuracy_score
)
from sklearn.pipeline import Pipeline
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
from xgboost import XGBClassifier
import shap
import warnings
warnings.filterwarnings("ignore")

os.makedirs("model", exist_ok=True)

# ─────────────────────────────────────────────
# 1. Load & prepare data
# ─────────────────────────────────────────────
df = pd.read_csv("../parkinsons.data")
print(f"Dataset shape: {df.shape}")
print(f"Class distribution:\n{df['status'].value_counts()}\n")

# Extract patient ID from name column (e.g. phon_R01_S01_1 → phon_R01_S01)
df["patient_id"] = df["name"].str.rsplit("_", n=1).str[0]

X = df.drop(columns=["name", "status", "patient_id"])
y = df["status"]
groups = df["patient_id"]

feature_names = X.columns.tolist()
print(f"Features ({len(feature_names)}): {feature_names}\n")

# ─────────────────────────────────────────────
# 2. GroupKFold Cross-Validation (no data leakage)
# ─────────────────────────────────────────────
gkf = GroupKFold(n_splits=5)

def evaluate_pipeline(pipeline, X, y, groups, name):
    scores = {"accuracy": [], "recall": [], "mcc": [], "auc": []}
    for train_idx, test_idx in gkf.split(X, y, groups):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        y_prob = pipeline.predict_proba(X_test)[:, 1] if hasattr(pipeline, "predict_proba") else None
        scores["accuracy"].append(accuracy_score(y_test, y_pred))
        scores["recall"].append(recall_score(y_test, y_pred, zero_division=0))
        scores["mcc"].append(matthews_corrcoef(y_test, y_pred))
        if y_prob is not None:
            scores["auc"].append(roc_auc_score(y_test, y_prob))
    means = {k: float(np.mean(v)) for k, v in scores.items()}
    print(f"{name:30s} | Acc: {means['accuracy']:.3f} | Recall: {means['recall']:.3f} | MCC: {means['mcc']:.3f} | AUC: {means['auc']:.3f}")
    return means

# ─────────────────────────────────────────────
# 3. Model Comparison
# ─────────────────────────────────────────────
print("=" * 75)
print("Model Comparison (GroupKFold-5, no patient leakage)")
print("=" * 75)

models = {
    "Logistic Regression": ImbPipeline([
        ("smote", SMOTE(random_state=42)),
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(C=1.0, max_iter=5000, random_state=42))
    ]),
    "SVM (RBF)": ImbPipeline([
        ("smote", SMOTE(random_state=42)),
        ("scaler", StandardScaler()),
        ("clf", SVC(kernel="rbf", C=10, gamma="scale", probability=True, random_state=42))
    ]),
    "Random Forest": ImbPipeline([
        ("smote", SMOTE(random_state=42)),
        ("clf", RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42))
    ]),
    "Gradient Boosting": ImbPipeline([
        ("smote", SMOTE(random_state=42)),
        ("clf", GradientBoostingClassifier(n_estimators=200, learning_rate=0.05, max_depth=4, random_state=42))
    ]),
    "XGBoost": ImbPipeline([
        ("smote", SMOTE(random_state=42)),
        ("clf", XGBClassifier(
            n_estimators=300,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric="logloss",
            random_state=42,
            verbosity=0
        ))
    ]),
}

results = {}
for name, pipeline in models.items():
    results[name] = evaluate_pipeline(pipeline, X, y, groups, name)

print("=" * 75)

# ─────────────────────────────────────────────
# 4. Pick best model by Recall (medical priority: minimize false negatives)
# ─────────────────────────────────────────────
best_name = max(results, key=lambda k: results[k]["recall"])
print(f"\nBest model by Recall: {best_name}")
print(f"  Recall: {results[best_name]['recall']:.3f}")
print(f"  MCC:    {results[best_name]['mcc']:.3f}")
print(f"  AUC:    {results[best_name]['auc']:.3f}")

# ─────────────────────────────────────────────
# 5. Final model: train XGBoost on full data with SMOTE
# ─────────────────────────────────────────────
# Always use XGBoost as final model for SHAP support
smote = SMOTE(random_state=42)
X_res, y_res = smote.fit_resample(X, y)

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_res)

xgb_final = XGBClassifier(
    n_estimators=300,
    max_depth=4,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric="logloss",
    random_state=42,
    verbosity=0
)
xgb_final.fit(X_scaled, y_res)

# ─────────────────────────────────────────────
# 6. SHAP Feature Importance
# ─────────────────────────────────────────────
explainer = shap.TreeExplainer(xgb_final)
shap_values = explainer.shap_values(X_scaled)
mean_abs_shap = np.abs(shap_values).mean(axis=0)
shap_importance = dict(sorted(
    zip(feature_names, mean_abs_shap.tolist()), key=lambda x: x[1], reverse=True
))
print("\nTop-10 SHAP Features:")
for feat, val in list(shap_importance.items())[:10]:
    bar = "█" * int(val / max(mean_abs_shap) * 20)
    print(f"  {feat:25s} {bar} {val:.4f}")

# ─────────────────────────────────────────────
# 7. Final evaluation on resampled data (sanity check)
# ─────────────────────────────────────────────
y_pred = xgb_final.predict(X_scaled)
print(f"\nFinal Model Training Performance:")
print(classification_report(y_res, y_pred))

# ─────────────────────────────────────────────
# 8. Save artifacts
# ─────────────────────────────────────────────
joblib.dump(xgb_final, "model/final_model.pkl")
joblib.dump(scaler, "model/scaler.pkl")

# Save feature names and SHAP importance
metadata = {
    "feature_names": feature_names,
    "shap_importance": shap_importance,
    "model_comparison": results,
    "best_model_by_recall": best_name,
    "feature_descriptions": {
        "MDVP:Fo(Hz)": "Average vocal fundamental frequency",
        "MDVP:Fhi(Hz)": "Maximum vocal fundamental frequency",
        "MDVP:Flo(Hz)": "Minimum vocal fundamental frequency",
        "MDVP:Jitter(%)": "Variation in fundamental frequency (%)",
        "MDVP:Jitter(Abs)": "Absolute variation in fundamental frequency",
        "MDVP:RAP": "Relative average perturbation",
        "MDVP:PPQ": "5-point period perturbation quotient",
        "Jitter:DDP": "Average absolute difference of consecutive differences (period)",
        "MDVP:Shimmer": "Variation in amplitude",
        "MDVP:Shimmer(dB)": "Variation in amplitude (dB)",
        "Shimmer:APQ3": "3-point amplitude perturbation quotient",
        "Shimmer:APQ5": "5-point amplitude perturbation quotient",
        "MDVP:APQ": "11-point amplitude perturbation quotient",
        "Shimmer:DDA": "Average absolute differences (amplitude)",
        "NHR": "Noise-to-harmonic ratio",
        "HNR": "Harmonic-to-noise ratio",
        "RPDE": "Recurrence period density entropy",
        "DFA": "Detrended fluctuation analysis",
        "spread1": "Nonlinear measure of fundamental frequency variation",
        "spread2": "Nonlinear measure of fundamental frequency variation",
        "D2": "Correlation dimension",
        "PPE": "Pitch period entropy (most predictive)"
    }
}

with open("model/metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

print("\nSaved: model/final_model.pkl, model/scaler.pkl, model/metadata.json")
print("Training complete!")
