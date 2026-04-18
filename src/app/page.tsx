"use client";

import { useRef, useState } from "react";

export default function Home() {
  const [screen, setScreen] = useState<"select" | "player">("select");
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState<
    "Rain" | "Wave" | "River" | "Bonfire" | "Wind" | "Noise"
  >("Rain");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const createNoise = (ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  };

  const getSoundConfig = () => {
    switch (selectedSound) {
      case "Wave":
        return {
          title: "Ocean Wave",
          subtitle: "Low and steady texture for calm rest.",
          frequency: 1200,
          gain: 0.3,
          controlLabel: "Wave",
        };
      case "River":
        return {
          title: "River Flow",
          subtitle: "A brighter stream-like texture.",
          frequency: 3200,
          gain: 0.2,
          controlLabel: "River",
        };
      case "Bonfire":
        return {
          title: "Bonfire",
          subtitle: "Warm and soft ambience for deep relaxation.",
          frequency: 850,
          gain: 0.26,
          controlLabel: "Fire",
        };
      case "Wind":
        return {
          title: "Night Wind",
          subtitle: "Airy and light sound for quiet focus.",
          frequency: 1900,
          gain: 0.18,
          controlLabel: "Wind",
        };
      case "Noise":
        return {
          title: "White Noise",
          subtitle: "Stable masking sound for sleep and focus.",
          frequency: 4200,
          gain: 0.14,
          controlLabel: "Noise",
        };
      default:
        return {
          title: "Gentle Rain",
          subtitle: "Endless rain sound for deep sleep and calm focus.",
          frequency: 2500,
          gain: 0.25,
          controlLabel: "Rain",
        };
    }
  };

  const startRain = async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    const ctx = audioCtxRef.current;
    const sound = getSoundConfig();

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    if (noiseRef.current) return;

    const noise = ctx.createBufferSource();
    noise.buffer = createNoise(ctx);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = sound.frequency;

    const gain = ctx.createGain();
    gain.gain.value = sound.gain;
    gainRef.current = gain;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noiseRef.current = noise;
  
    setInterval(() => {
      filter.frequency.value =
        sound.frequency + Math.random() * 300 - 150;
    }, 500);
  };   

  const stopRain = () => {
    if (noiseRef.current) {
      noiseRef.current.stop();
      noiseRef.current.disconnect();
      noiseRef.current = null;
    }
  };

  const toggle = async () => {
    if (isPlaying) {
      stopRain();
      setIsPlaying(false);
    } else {
      await startRain();
      setIsPlaying(true);
    }
  };

  const handleSelectSound = (
    sound: "Rain" | "Wave" | "River" | "Bonfire" | "Wind" | "Noise"
  ) => {
    if (isPlaying) {
      stopRain();
      setIsPlaying(false);
    }
    setSelectedSound(sound);
    setScreen("player");
  };

  // =====================
  // UI SCREENS
  // =====================

  if (screen === "select") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2a44_0%,_#0d1321_45%,_#05070d_100%)] text-white flex items-center justify-center p-6 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-sky-400/20 rounded-full blur-3xl animate-pulse top-[-100px] left-[-100px]" />
        <div className="absolute w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-3xl animate-pulse bottom-[-120px] right-[-80px]" />

        <div className="relative w-full max-w-sm min-h-[720px] rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="px-6 pt-6">
            <button className="text-sm text-white/0 select-none pointer-events-none">
              ← Back
            </button>
          </div>

          <div className="px-6 pt-2 pb-5 text-center">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-white/10 flex items-center justify-center shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-300/40 to-indigo-400/20 animate-pulse" />
              <div className="h-4 w-4 rounded-full bg-sky-300 z-10" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/45">
              Sleep App
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Choose Sound
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Select your environment
            </p>
          </div>

          <div className="px-6 pb-6">
            <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-lg">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: "Rain", icon: "🌧️" },
                  { name: "Wave", icon: "🌊" },
                  { name: "River", icon: "🏞️" },
                  { name: "Bonfire", icon: "🔥" },
                  { name: "Wind", icon: "🌬️" },
                  { name: "Noise", icon: "⚪" },
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleSelectSound(item.name as "Rain" | "Wave" | "River" | "Bonfire" | "Wind" | "Noise")}
                    className="group flex flex-col items-center"
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-[22px] border border-white/10 bg-white/5 backdrop-blur-md shadow-lg shadow-black/10 transition duration-200 group-hover:scale-[1.03] group-hover:bg-white/8 group-active:scale-[0.98]">
                      <span className="text-2xl">{item.icon}</span>
                    </div>
                    <span className="mt-2 text-xs text-white/65">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white/85">
                  Unlock Full Sleep
                </p>
                <p className="text-xs text-white/45">
                  Unlimited timer & sound mixing
                </p>
              </div>
              <button className="rounded-full border border-amber-300/30 bg-amber-300/20 px-3 py-1.5 text-xs font-medium text-amber-200">
                Premium
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================
  // PLAYER SCREEN
  // =====================

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2a44_0%,_#0d1321_45%,_#05070d_100%)] text-white flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute w-[500px] h-[500px] bg-sky-400/20 rounded-full blur-3xl animate-pulse top-[-100px] left-[-100px]" />
      <div className="absolute w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-3xl animate-pulse bottom-[-120px] right-[-80px]" />

      <div className="relative w-full max-w-sm min-h-[720px] rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6">
          <button
            onClick={() => setScreen("select")}
            className="text-sm text-white/60"
          >
            ← Back
          </button>
        </div>

        <div className="px-6 pt-2 pb-5 text-center">
          <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-white/10 flex items-center justify-center shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-300/40 to-indigo-400/20 animate-pulse" />
            {isPlaying && (
              <div className="absolute inset-0 animate-ping bg-sky-300/20" />
            )}
            <div className="h-4 w-4 rounded-full bg-sky-300 z-10" />
          </div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/45">
            Sleep App
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {getSoundConfig().title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/60">
            {getSoundConfig().subtitle}
          </p>
        </div>

        <div className="px-6 pb-6">
          <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-lg">
            <button
              onClick={toggle}
              className="w-full rounded-2xl bg-gradient-to-r from-sky-300 to-indigo-400 py-4 text-base font-medium text-slate-900 shadow-lg shadow-sky-500/30 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              {isPlaying ? "Pause" : `Play ${selectedSound}`}
            </button>

            <div className="mt-6 space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-white/75">
                  <span>{getSoundConfig().controlLabel}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  defaultValue={getSoundConfig().gain}
                  className="w-full accent-sky-300"
                  onChange={(e) => {
                    if (gainRef.current) {
                      gainRef.current.gain.value = Number(e.target.value);
                    }
                  }}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-white/75">
                  <span>Sleep Timer</span>
                  <span className="text-white/40">2h</span>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  <button className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-white/75">
                    30m
                  </button>
                  <button className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-white/75">
                    60m
                  </button>
                  <button className="rounded-xl border border-sky-300/30 bg-sky-300/20 py-2.5 text-sm text-sky-200">
                    2h
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button className="relative rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-white/40">
                    3h
                    <span className="absolute right-2 top-1 text-[10px] text-amber-300">
                      🔒
                    </span>
                  </button>
                  <button className="relative rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-white/40">
                    6h
                    <span className="absolute right-2 top-1 text-[10px] text-amber-300">
                      🔒
                    </span>
                  </button>
                  <button className="relative rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-white/40">
                    8h
                    <span className="absolute right-2 top-1 text-[10px] text-amber-300">
                      🔒
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white/85">
                Unlock Full Sleep
              </p>
              <p className="text-xs text-white/45">
                Unlimited timer & sound mixing
              </p>
            </div>
            <button className="rounded-full border border-amber-300/30 bg-amber-300/20 px-3 py-1.5 text-xs font-medium text-amber-200">
              Premium
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

