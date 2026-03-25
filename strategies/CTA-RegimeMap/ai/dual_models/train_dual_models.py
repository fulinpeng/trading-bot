#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
双模型训练：多单 / 空单各一个 LightGBM 二分类器，标签为 Step1 导出的 label。
特征顺序（不含 is_long，因已按方向拆分）：rsi, atr, adx, price_vs_ma, volatility
时间序划分：按 openTime 排序后，前 train_ratio 为训练集，其余为验证集。
导出：LightGBM 模型文件 + m2cgen 生成的 Node 可调用的 JS（scoreLong / scoreShort）
"""

from __future__ import annotations

import argparse
import json
import os
import warnings
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import m2cgen as m2c
import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
warnings.filterwarnings(
    "ignore",
    message="X does not have valid feature names, but LGBMClassifier was fitted with feature names",
    category=UserWarning,
)

from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)


# 与 Step1 JSON 中 features 一致，但训练时按方向拆分后不再使用 is_long
DEFAULT_FEATURE_COLS = ["rsi", "atr", "adx", "price_vs_ma", "volatility"]


def parse_open_time(s: str) -> datetime:
    """解析 '2021-01-25_18-00-00' 为 datetime，用于排序。"""
    return datetime.strptime(s.strip(), "%Y-%m-%d_%H-%M-%S")


def load_samples(path: Path) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    meta = data.get("meta") or {}
    samples = data.get("samples") or []
    return meta, samples


def samples_to_frame(
    samples: List[Dict[str, Any]], is_long: int, feature_cols: List[str]
) -> pd.DataFrame:
    rows = []
    for s in samples:
        if s.get("is_long") != is_long:
            continue
        row: Dict[str, Any] = {}
        ok = True
        for c in feature_cols:
            v = s.get(c)
            if v is None:
                ok = False
                break
            try:
                fv = float(v)
            except (TypeError, ValueError):
                ok = False
                break
            if np.isnan(fv):
                ok = False
                break
            row[c] = fv
        if not ok:
            continue
        row["openTime"] = s.get("openTime")
        row["label"] = int(s["label"])
        rows.append(row)
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df["_ts"] = df["openTime"].map(parse_open_time)
    df = df.sort_values("_ts").reset_index(drop=True)
    return df


def time_split(
    df: pd.DataFrame, train_ratio: float
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    n = len(df)
    if n == 0:
        return df, df
    cut = max(1, int(n * train_ratio))
    if cut >= n:
        cut = n - 1 if n > 1 else n
    train_df = df.iloc[:cut].copy()
    val_df = df.iloc[cut:].copy()
    if len(val_df) == 0 and n > 1:
        # 至少留 1 条验证
        train_df = df.iloc[:-1].copy()
        val_df = df.iloc[-1:].copy()
    return train_df, val_df


def train_one_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    seed: int,
    lgbm_params: Optional[Dict[str, Any]] = None,
) -> Tuple[LGBMClassifier, Dict[str, Any]]:
    pos = (y_train == 1).sum()
    neg = (y_train == 0).sum()
    scale_pos_weight = (neg / pos) if pos > 0 else 1.0

    params = {
        "n_estimators": 200,
        "max_depth": 5,
        "learning_rate": 0.05,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "reg_lambda": 1.0,
        "random_state": seed,
        "n_jobs": -1,
        "verbose": -1,
        "scale_pos_weight": float(scale_pos_weight),
    }
    if lgbm_params:
        params.update(lgbm_params)

    model = LGBMClassifier(**params)
    model.fit(X_train, y_train)

    metrics: Dict[str, Any] = {}
    if len(X_val) == 0:
        metrics["note"] = "无验证集"
        return model, metrics

    proba = model.predict_proba(X_val)[:, 1]

    if len(np.unique(y_val)) < 2:
        metrics["val_auc"] = None
        metrics["note"] = "验证集仅单一类别，无法计算 AUC"
    else:
        metrics["val_auc"] = float(roc_auc_score(y_val, proba))

    # 在验证集上扫阈值，取 F1 最大（可改为 precision 优先）
    if len(np.unique(y_val)) < 2:
        metrics["best_threshold_f1"] = 0.5
        metrics["val_precision"] = metrics["val_recall"] = metrics["val_f1"] = metrics[
            "val_accuracy"
        ] = None
        metrics["note"] = (metrics.get("note") or "") + "；验证集仅单一类别，阈值未优化"
        return model, metrics

    precisions, recalls, thresholds = precision_recall_curve(y_val, proba)
    f1s = (
        2 * precisions[:-1] * recalls[:-1] / (precisions[:-1] + recalls[:-1] + 1e-12)
    )
    best_idx = int(np.nanargmax(f1s)) if len(f1s) else 0
    if len(thresholds) == 0:
        best_threshold = 0.5
    else:
        best_idx = min(best_idx, len(thresholds) - 1)
        best_threshold = float(thresholds[best_idx])
    y_pred = (proba >= best_threshold).astype(int)

    metrics["best_threshold_f1"] = best_threshold
    metrics["val_precision"] = float(precision_score(y_val, y_pred, zero_division=0))
    metrics["val_recall"] = float(recall_score(y_val, y_pred, zero_division=0))
    metrics["val_f1"] = float(f1_score(y_val, y_pred, zero_division=0))
    metrics["val_accuracy"] = float(accuracy_score(y_val, y_pred))

    return model, metrics


def export_m2c_js(model: LGBMClassifier, function_name: str) -> str:
    return m2c.export_to_javascript(model, indent=4, function_name=function_name)


@dataclass
class DirectionResult:
    name: str
    n_train: int
    n_val: int
    feature_cols: List[str]
    metrics: Dict[str, Any]
    model_txt: str
    js_path: str


def run_direction(
    df: pd.DataFrame,
    name: str,
    feature_cols: List[str],
    train_ratio: float,
    seed: int,
    out_dir: Path,
    lgbm_params: Optional[Dict[str, Any]],
    js_function_name: str,
) -> Optional[DirectionResult]:
    if len(df) < 4:
        print(f"[{name}] 样本过少（<4），跳过训练。n={len(df)}")
        return None

    train_df, val_df = time_split(df, train_ratio)
    X_train = train_df[feature_cols].values.astype(np.float64)
    y_train = train_df["label"].values.astype(np.int32)
    X_val = val_df[feature_cols].values.astype(np.float64)
    y_val = val_df["label"].values.astype(np.int32)

    if len(np.unique(y_train)) < 2:
        print(f"[{name}] 训练集仅单一类别，跳过。")
        return None

    model, metrics = train_one_model(
        X_train, y_train, X_val, y_val, seed, lgbm_params
    )

    prefix = "long" if name == "long" else "short"
    model_txt_path = out_dir / f"lgbm_{prefix}.txt"
    model.booster_.save_model(str(model_txt_path))

    js_body = export_m2c_js(model, js_function_name)
    js_path = out_dir / f"score_{prefix}.js"
    # CommonJS 导出，便于 Node require
    js_full = (
        f"'use strict';\n\n"
        f"{js_body}\n\n"
        f"module.exports = {{ {js_function_name} }};\n"
    )
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js_full)

    print(
        f"[{name}] train={len(train_df)} val={len(val_df)} "
        f"AUC={metrics.get('val_auc')} F1={metrics.get('val_f1')} "
        f"threshold={metrics.get('best_threshold_f1')}"
    )

    return DirectionResult(
        name=name,
        n_train=len(train_df),
        n_val=len(val_df),
        feature_cols=feature_cols,
        metrics=metrics,
        model_txt=str(model_txt_path.relative_to(out_dir)),
        js_path=str(js_path.relative_to(out_dir)),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="双模型 LightGBM 训练 + m2cgen 导出 JS")
    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help="Step1 导出的 JSON 路径",
    )
    parser.add_argument(
        "--out-dir",
        type=str,
        default=None,
        help="输出目录（默认：本脚本同级的 output/）",
    )
    parser.add_argument("--train-ratio", type=float, default=0.8)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    default_input = script_dir.parent.parent / "training-data" / "ml-training-data-ethusdt-30m.json"
    input_path = Path(args.input) if args.input else default_input
    out_dir = Path(args.out_dir) if args.out_dir else (script_dir / "output")
    out_dir.mkdir(parents=True, exist_ok=True)

    if not input_path.exists():
        raise SystemExit(f"找不到训练数据文件: {input_path}")

    meta, samples = load_samples(input_path)
    feature_cols = [c for c in DEFAULT_FEATURE_COLS if c != "is_long"]

    df_long = samples_to_frame(samples, 1, feature_cols)
    df_short = samples_to_frame(samples, 0, feature_cols)

    results: Dict[str, Any] = {
        "input": str(input_path),
        "meta": meta,
        "feature_cols": feature_cols,
        "feature_order_note": "Node 侧构造 input 数组时须与此顺序一致：input[0]=rsi ... input[4]=volatility",
        "m2cgen_score_output": "[P(label=0), P(label=1)]，正类概率请取返回值下标 1",
        "train_ratio": args.train_ratio,
        "seed": args.seed,
        "long": None,
        "short": None,
    }

    r_long = run_direction(
        df_long,
        "long",
        feature_cols,
        args.train_ratio,
        args.seed,
        out_dir,
        None,
        "scoreLong",
    )
    r_short = run_direction(
        df_short,
        "short",
        feature_cols,
        args.train_ratio,
        args.seed,
        out_dir,
        None,
        "scoreShort",
    )

    if r_long:
        results["long"] = {
            "n_train": r_long.n_train,
            "n_val": r_long.n_val,
            "metrics": r_long.metrics,
            "model_txt": r_long.model_txt,
            "js": r_long.js_path,
            "js_function": "scoreLong",
        }
    if r_short:
        results["short"] = {
            "n_train": r_short.n_train,
            "n_val": r_short.n_val,
            "metrics": r_short.metrics,
            "model_txt": r_short.model_txt,
            "js": r_short.js_path,
            "js_function": "scoreShort",
        }

    manifest_path = out_dir / "training_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Wrote manifest: {manifest_path}")


if __name__ == "__main__":
    main()
