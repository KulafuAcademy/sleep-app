"use client";

import { useRef, useState } from "react";
import { CloudRain, Waves, Trees, Flame, Wind, Circle } from "lucide-react";

type SoundName =
  | "Rain"
  | "Wave"
  | "River"
  | "Bonfire"
  | "Forest"
  | "Noise";

const sounds: { name: SoundName; icon: React.ComponentType<{ className?: string }> }[] = [
  { name: "Rain", icon: CloudRain },
  { name: "Wave", icon: Wind },
  { name: "River", icon: Waves },
  { name: "Bonfire", icon: Flame },
  { name: "Forest", icon: Trees },
  { name: "Noise", icon: Circle },
];

export default function Home() {
  const [screen, setScreen] = useState<"select" | "player">("select");
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState<SoundName>("Rain");

  const audioCtxRef = useRef<AudioContext | null>(null);

 const playChapu = async () => {
  try {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    const ctx = audioCtxRef.current;

    const res = await fetch("/sound/wave/chapu_small.wav");
    console.log("fetch status:", res.status, res.headers.get("content-type"));

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    console.log("arrayBuffer bytes:", arrayBuffer.byteLength);

    const buffer = await ctx.decodeAudioData(arrayBuffer);
    console.log("decoded:", buffer.duration);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 0.8 + Math.random() * 0.4;

    const gain = ctx.createGain();
    gain.gain.value = 0.012;

    source.connect(gain);
    gain.connect(ctx.destination);

    source.start();
  } catch (error) {
    console.error("playChapu error:", error);
  }
};

  const noiseRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lowRef = useRef<AudioBufferSourceNode | null>(null);
  const loopAudioRef = useRef<HTMLAudioElement | null>(null);


  const [highLevel, setHighLevel] = useState(0.015);
  const [highFreq, setHighFreq] = useState(1800);
  
  const highLevelRef = useRef(0.015);
  const highFreqRef = useRef(1800);
  
  const [splashChance, setSplashChance] = useState(0.2);
  const [splashLength, setSplashLength] = useState(25);
  
  const splashChanceRef = useRef(0.2);
  const splashLengthRef = useRef(25);



  const createNoise = (ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3 + (data[i - 1] || 0) * 0.7;
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
      case "Forest":
        return {
          title: "Forest",
          subtitle: "Gentle natural ambience for relaxation.",
          frequency: 1900,
          gain: 0.18,
          controlLabel: "Forest",
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

         // 👇ここ！！！！（この直後）
           const getSamplePath = () => {
            switch (selectedSound) {
            case "Rain":
            return "/sound/rain/rain_loop.wav";
            case "River":
            return "/sound/river/river_loop.wav";
            case "Forest":
            return "/sound/forest/forest_loop.wav";
            case "Bonfire":
            return "/sound/bonfire/bonfire_loop.wav";
            case "Noise":
            return "/sound/noise/noise_loop.wav";
            default:
        return null;
    }
  };

    const stopRain = () => {
  if (intervalRef.current !== null) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  if (noiseRef.current) {
    noiseRef.current.stop();
    noiseRef.current.disconnect();
    noiseRef.current = null;
  }

  if (lowRef.current) {
    lowRef.current.stop();
    lowRef.current.disconnect();
    lowRef.current = null;
  }

  // 👇ここに追加
   if (loopAudioRef.current) {
    loopAudioRef.current.pause();
    loopAudioRef.current.currentTime = 0;
    loopAudioRef.current = null;
  }
};

const startRain = async () => {
  stopRain();

  if (!audioCtxRef.current) {
    audioCtxRef.current = new AudioContext();
  }

    const ctx = audioCtxRef.current;
    const sound = getSoundConfig();

const samplePath = getSamplePath();

if (samplePath) {
  const audio = new Audio(samplePath);
  audio.loop = true;
  audio.volume = 0.6;
  loopAudioRef.current = audio;
  await audio.play();
  return;
}

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    if (noiseRef.current) return;

    const noise = ctx.createBufferSource();
    noise.buffer = createNoise(ctx);
    noise.loop = true;

    // 👇低音レイヤー
    if (selectedSound === "Wave") {
    const low = ctx.createBufferSource();
    low.buffer = createNoise(ctx);
    low.loop = true;

    const lowFilter = ctx.createBiquadFilter();
    lowFilter.type = "lowpass";
    lowFilter.frequency.value = 450;

    const lowGain = ctx.createGain();
    lowGain.gain.value = 0.05;

    low.connect(lowFilter);
    lowFilter.connect(lowGain);
    lowGain.connect(ctx.destination);

    low.start();
    lowRef.current = low; // ←これを追加
  }

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

    if (selectedSound === "Wave") {
      intervalRef.current = window.setInterval(() => {
      const base = 500 + Math.sin(Date.now() / 2400) * 260;
      filter.frequency.value = base 

      gain.gain.value = sound.gain * 0.25;
      
      // 👇高音ブロック（チャプチャプ）
    if (Math.random() < splashChanceRef.current) {
       playChapu();
          }
         }, 400);
        }

   if (selectedSound === "Rain") {
  intervalRef.current = window.setInterval(() => {
    const base = 1800 + Math.sin(Date.now() / 1800) * 120;
    filter.frequency.value = base + Math.random() * 80;

    const rain = 0.7 + Math.random() * 0.08;
    gain.gain.value = rain * sound.gain;
     }, 250);
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

  const handleSelectSound = (sound: SoundName) => {
    if (isPlaying) {
      stopRain();
      setIsPlaying(false);
    }
    setSelectedSound(sound);
  };

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
              My Sleep App
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
                {sounds.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedSound === item.name;

                  return (
                    <button
                      key={item.name}
                      onClick={() => handleSelectSound(item.name)}
                      className="group flex flex-col items-center"
                    >
                      <div
                        className={`flex h-20 w-20 items-center justify-center rounded-[22px] border backdrop-blur-md shadow-lg transition-all duration-200 ${
                          isSelected
                            ? "border-sky-300/40 bg-sky-300/10 scale-[1.05]"
                            : "border-white/10 bg-white/5 group-hover:scale-[1.03] group-hover:bg-white/8"
                        }`}
                      >
                        <Icon
                          className={`w-8 h-8 transition-all ${
                            isSelected
                              ? "text-sky-300 scale-110"
                              : "text-white/60 group-hover:text-white"
                          }`}
                        />
                      </div>
                      <span
                        className={`mt-2 text-xs ${
                          isSelected ? "text-sky-200" : "text-white/65"
                        }`}
                      >
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setScreen("player")}
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-sky-300 to-indigo-400 py-4 text-base font-medium text-slate-900 shadow-lg shadow-sky-500/30 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue with {selectedSound}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white/85">
                  Create Soundscape
                </p>
                <p className="text-xs text-white/45">
                  Build your own ambient world
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            My Sleep App
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
            <button
            onClick={playChapu}
             className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-white/75"
            >
            Test Chapu
            </button>



             {/* 👇スライダー */}
                <div className="mt-6 space-y-4 border border-red-500 p-4">
                <div>
                <div className="mb-2 flex justify-between text-sm text-white/75">
                <span>High Layer Level</span>
                <span className="text-white/40">{highLevel.toFixed(3)}</span>
               </div>
                <input
                   type="range"
                    min="0"
                    max="0.05"
                    step="0.001"
                    value={highLevel}
                    onChange={(e) => {
                     const value = Number(e.target.value);
                     setHighLevel(value);
                     highLevelRef.current = value;
                   }}
                     className="w-full"
                   />
                  </div>

                  <div>
                   <div className="mb-2 flex justify-between text-sm text-white/75">
                  <span>High Layer Frequency</span>
                  <span className="text-white/40">{highFreq}</span>
                  </div>
                   <input
                     type="range"
                     min="400"
                     max="5000"
                     step="50"
                     value={highFreq}
                     onChange={(e) => {
                     const value = Number(e.target.value);
                     setHighFreq(value);
                     highFreqRef.current = value;
                   }}
                     className="w-full"
                      />
                    </div>
                    <div>
                    <div className="mb-2 flex justify-between text-sm text-white/75">
                    <span>Splash Chance</span>
                    <span className="text-white/40">{splashChance.toFixed(2)}</span>
                    </div>
                    <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={splashChance}
                    onChange={(e) => {
                    const value = Number(e.target.value);
                    setSplashChance(value);
                    splashChanceRef.current = value;
                  }}
                   className="w-full"
                  />
                  </div>

                  <div>
                  <div className="mb-2 flex justify-between text-sm text-white/75">
                  <span>Splash Length</span>
                  <span className="text-white/40">{splashLength}ms</span>
                 </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={splashLength}
                  onChange={(e) => {
                  const value = Number(e.target.value);
                  setSplashLength(value);
                  splashLengthRef.current = value;
                  }}
                    className="w-full"
                   />
                </div>

                </div>
              </div>
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
                  </button>
                  <button className="relative rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-white/40">
                    6h
                  </button>
                  <button className="relative rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-white/40">
                    8h
                  </button>
                </div>
                 
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white/85">
                Create Soundscape
              </p>
              <p className="text-xs text-white/45">
                Build your own ambient world
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}