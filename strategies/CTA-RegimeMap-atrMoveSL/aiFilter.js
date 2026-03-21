/**
 * Step 3：AI 开仓过滤（m2cgen 导出的 score_long.js / score_short.js）
 * 特征顺序与训练一致：[rsi, atr, adx, price_vs_ma, volatility]
 * 正类概率 = scoreFn(input)[1]
 */

const fs = require("fs");
const path = require("path");
const { getLastFromArr } = require("../../utils/functions.js");

const DEFAULT_MANIFEST_REL = path.join("ai", "dual_models", "output", "training_manifest.json");

let cached = null;

/**
 * @param {Object} opts
 * @param {string} opts.strategyDir - __dirname of index.js (strategy root)
 * @param {string} [opts.manifestRel] - 相对策略目录的 manifest 路径
 */
function loadAiModels(strategyDir, manifestRel = DEFAULT_MANIFEST_REL) {
    if (cached !== null) return cached;

    const manifestPath = path.resolve(strategyDir, manifestRel);
    if (!fs.existsSync(manifestPath)) {
        console.warn("[aiFilter] manifest not found:", manifestPath);
        return (cached = { ok: false, reason: "no_manifest" });
    }

    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (e) {
        console.warn("[aiFilter] manifest parse error:", e.message);
        return (cached = { ok: false, reason: "manifest_parse" });
    }

    const outDir = path.dirname(manifestPath);
    const longJs = path.join(outDir, manifest.long?.js || "score_long.js");
    const shortJs = path.join(outDir, manifest.short?.js || "score_short.js");

    if (!fs.existsSync(longJs) || !fs.existsSync(shortJs)) {
        console.warn("[aiFilter] score js missing:", { longJs, shortJs });
        return (cached = { ok: false, reason: "no_score_js" });
    }

    delete require.cache[require.resolve(longJs)];
    delete require.cache[require.resolve(shortJs)];
    const longMod = require(longJs);
    const shortMod = require(shortJs);
    const scoreLong = longMod.scoreLong;
    const scoreShort = shortMod.scoreShort;

    if (typeof scoreLong !== "function" || typeof scoreShort !== "function") {
        console.warn("[aiFilter] scoreLong/scoreShort not functions");
        return (cached = { ok: false, reason: "bad_exports" });
    }

    const thrLong = manifest.long?.metrics?.best_threshold_f1 ?? 0.5;
    const thrShort = manifest.short?.metrics?.best_threshold_f1 ?? 0.5;

    cached = {
        ok: true,
        scoreLong,
        scoreShort,
        thresholdLong: Number(thrLong),
        thresholdShort: Number(thrShort),
        manifestPath,
    };
    return cached;
}

/**
 * 从 state 提取与 Step1 一致的特征向量
 * @returns {number[]|null} 长度 5 或 null（缺数据则不过滤，由调用方决定）
 */
function buildFeatureVector(state) {
    const [rsiItem] = getLastFromArr(state.rsiArr, 1);
    const [superTrendItem] = getLastFromArr(state.superTrendArr, 1);
    const [adxItem] = getLastFromArr(state.adxArr, 1);
    const [ema50Item] = getLastFromArr(state.ema50Arr, 1);
    const price = state.currentPrice;
    const rsi = rsiItem != null ? Number(rsiItem) : NaN;
    const atr = superTrendItem?.atr != null ? Number(superTrendItem.atr) : NaN;
    const adx = adxItem?.ADX != null ? Number(adxItem.ADX) : NaN;
    const ma = ema50Item != null ? Number(ema50Item) : NaN;
    if (!price || price <= 0 || !Number.isFinite(ma) || ma <= 0) return null;
    const price_vs_ma = price / ma;
    const volatility = Number.isFinite(atr) && price > 0 ? atr / price : NaN;
    const vec = [rsi, atr, adx, price_vs_ma, volatility];
    if (vec.some((v) => !Number.isFinite(v))) return null;
    return vec;
}

/**
 * @param {object} state
 * @param {'up'|'down'} trend
 * @param {object} cfg - configEth 子集：enableAiFilter, aiManifestPath
 * @param {string} strategyDir - 策略根目录（index.js 所在目录）
 * @returns {{ pass: boolean, prob: number|null, threshold: number|null, skipped: boolean, reason?: string }}
 */
function evaluateAiFilter(state, trend, cfg, strategyDir) {
    const enable = cfg.enableAiFilter === true;
    if (!enable) {
        return { pass: true, prob: null, threshold: null, skipped: true, reason: "disabled" };
    }
    if (trend !== "up" && trend !== "down") {
        return { pass: true, prob: null, threshold: null, skipped: true, reason: "not_trade_trend" };
    }

    const manifestRel = cfg.aiManifestPath || DEFAULT_MANIFEST_REL;
    const models = loadAiModels(strategyDir, manifestRel);
    if (!models.ok) {
        return { pass: true, prob: null, threshold: null, skipped: true, reason: models.reason || "load_failed" };
    }

    const input = buildFeatureVector(state);
    if (!input) {
        console.warn("[aiFilter] incomplete features, pass through (no block)");
        return { pass: true, prob: null, threshold: null, skipped: true, reason: "incomplete_features" };
    }

    const isLong = trend === "up";
    const scoreFn = isLong ? models.scoreLong : models.scoreShort;
    const threshold = isLong ? models.thresholdLong : models.thresholdShort;
    const raw = scoreFn(input);
    const prob = Array.isArray(raw) && raw.length >= 2 ? Number(raw[1]) : NaN;
    if (!Number.isFinite(prob)) {
        console.warn("[aiFilter] bad score output", raw);
        return { pass: true, prob: null, threshold, skipped: true, reason: "bad_prob" };
    }

    const pass = prob >= threshold;
    return { pass, prob, threshold, skipped: false };
}

function resetAiFilterCache() {
    cached = null;
}

module.exports = {
    loadAiModels,
    buildFeatureVector,
    evaluateAiFilter,
    resetAiFilterCache,
    DEFAULT_MANIFEST_REL,
};
