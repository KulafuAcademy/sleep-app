const fs = require("fs");
const path = require("path");
const WavDecoder = require("wav-decoder");

const CATEGORY = process.argv[2] || "wave";
const BASE_DIR = path.join(__dirname, "..", "public", "sound", CATEGORY, "v1");
const OUTPUT_DIR = path.join(__dirname, "..", "output");

const FILES = ["a1.wav", "b1.wav", "c1.wav"];

const ANALYZE_DURATION_SEC = 8 * 60 * 60; // 8 hours
const WINDOW_SEC = 0.5;
const MIN_GAP_SEC = 6.0;
const LEAD_SEC = 4;

// まずは仮。あとでカテゴリごとに調整
const THRESHOLD_RATIO = 0.25;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 1;
}

function rms(samples, start, end) {
  let sum = 0;
  for (let i = start; i < end; i++) {
    const v = samples[i % samples.length] || 0;
    sum += v * v;
  }
  return Math.sqrt(sum / Math.max(1, end - start));
}

// 👇 ここに追加
function formatTime(sec) {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function decodeWav(filePath) {
  const buffer = fs.readFileSync(filePath);
  const audioData = await WavDecoder.decode(buffer);

  const channels = audioData.channelData;
  const length = channels[0].length;
  const mono = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let c = 0; c < channels.length; c++) {
      sum += channels[c][i] || 0;
    }
    mono[i] = sum / channels.length;
  }

  return {
    sampleRate: audioData.sampleRate,
    samples: mono,
  };
}

(async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const tracks = [];

  for (const file of FILES) {
    const filePath = path.join(BASE_DIR, file);

    if (!fs.existsSync(filePath)) {
      console.error(`Missing file: ${filePath}`);
      process.exit(1);
    }

    const decoded = await decodeWav(filePath);

    tracks.push({
      name: file.replace(".wav", ""),
      ...decoded,
    });
  }

  const sampleRate = tracks[0].sampleRate;
  const windowSamples = Math.floor(WINDOW_SEC * sampleRate);
  const totalSteps = Math.floor(ANALYZE_DURATION_SEC / WINDOW_SEC);

  // 各レイヤーの基準RMSを作る（最初の1周ぶん）
  for (const track of tracks) {
    const oneLoopSteps = Math.floor(track.samples.length / windowSamples);
    const values = [];

    for (let i = 0; i < oneLoopSteps; i++) {
      const start = i * windowSamples;
      const end = start + windowSamples;
      values.push(rms(track.samples, start, end));
    }

    track.baseRms = median(values);
  }

  const gaps = [];
  let currentGap = null;

  for (let step = 0; step < totalSteps; step++) {
    const timeSec = step * WINDOW_SEC;

    const levels = tracks.map((track) => {
      const start = Math.floor((timeSec * track.sampleRate) % track.samples.length);
      const end = start + windowSamples;

      const rawRms = rms(track.samples, start, end);
      const normalized = rawRms / track.baseRms;

      return {
        name: track.name,
        rawRms,
        normalized,
        isWeak: normalized < THRESHOLD_RATIO,
      };
    });

    const weakLayers = levels.filter((l) => l.isWeak).map((l) => l.name);

    if (weakLayers.length >= 2) {
      if (!currentGap) {
        currentGap = {
          startSec: timeSec,
          weakLayers: new Set(weakLayers),
          minNormalizedSum: levels.reduce((sum, l) => sum + l.normalized, 0),
        };
      } else {
        weakLayers.forEach((layer) => currentGap.weakLayers.add(layer));
        currentGap.minNormalizedSum = Math.min(
          currentGap.minNormalizedSum,
          levels.reduce((sum, l) => sum + l.normalized, 0),
        );
      }
    } else if (currentGap) {
      const endSec = timeSec;
      const duration = endSec - currentGap.startSec;

      if (duration >= MIN_GAP_SEC) {
        const severity = Math.max(
          0,
          Math.min(1, 1 - currentGap.minNormalizedSum / tracks.length),
        );

      gaps.push({
  id: gaps.length + 1,

  // 秒（内部・実装用）
  timeSec: Math.round(currentGap.startSec),
  startAtSec: Math.max(0, Math.round(currentGap.startSec - LEAD_SEC)),

  // 表示（人間用）
  time: formatTime(currentGap.startSec),
  startAt: formatTime(Math.max(0, currentGap.startSec - LEAD_SEC)),

  duration: Number(duration.toFixed(1)),
  weakLayers: Array.from(currentGap.weakLayers),

  severity: Number(severity.toFixed(3)),
});
}
      currentGap = null;
    }
  }

  const output = {
    category: CATEGORY,
    files: FILES,
    analyzedDurationSec: ANALYZE_DURATION_SEC,
    analyzedDurationHours: ANALYZE_DURATION_SEC / 3600,
    windowSec: WINDOW_SEC,
    minGapSec: MIN_GAP_SEC,
    leadSec: LEAD_SEC,
    thresholdRatio: THRESHOLD_RATIO,
    gapCount: gaps.length,
    gaps,
  };

  const outputPath = path.join(OUTPUT_DIR, `gaps_${CATEGORY}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`Saved: ${outputPath}`);
  console.log(`Gap count: ${gaps.length}`);
  console.table(gaps.slice(0, 30));
})();