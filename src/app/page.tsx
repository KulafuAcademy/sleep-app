"use client";

import { useRef, useState, useEffect } from "react";
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
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const [selectedTimer, setSelectedTimer] = useState<number | null>(null)

  const [soundscapeTimeLeft, setSoundscapeTimeLeft] = useState<number>(0)
  const [isSoundscapeTimerRunning, setIsSoundscapeTimerRunning] = useState(false)
  const [selectedSoundscapeTimer, setSelectedSoundscapeTimer] = useState<number | null>(null)
  
  const startSleepTimer = (minutes: number) => {
  const isSameTimer = selectedTimer === minutes && isTimerRunning

  if (isSameTimer) {
    setIsTimerRunning(false)
    setTimeLeft(0)
    setSelectedTimer(null)

    if (isPlaying) {
      toggle()
    }

    return
  }

  setSelectedTimer(minutes)
  setTimeLeft(minutes * 60)
  setIsTimerRunning(true)

  if (!isPlaying) {
    toggle()
  }
}

/* 👇ここに追加（この位置が正解） */
const startSoundscapeTimer = (minutes: number) => {

    const isSameTimer =
    selectedSoundscapeTimer === minutes && isSoundscapeTimerRunning

  if (isSameTimer) {
    setIsSoundscapeTimerRunning(false)
    setSoundscapeTimeLeft(0)
    setSelectedSoundscapeTimer(null)

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    if (isSoundscapePlaying) {
      stopSoundscape()
      setIsSoundscapePlaying(false)
    }

    return
  }
  setSelectedSoundscapeTimer(minutes)
  setSoundscapeTimeLeft(minutes * 60)
  setIsSoundscapeTimerRunning(true)

  if (!isSoundscapePlaying) {
  startSoundscape()
  setIsSoundscapePlaying(true)
}

  if (timerRef.current) {
    clearInterval(timerRef.current)
  }

  timerRef.current = setInterval(() => {
    setSoundscapeTimeLeft((prev) => {
      if (prev <= 1) {
        clearInterval(timerRef.current!)

        stopSoundscape()
        setIsSoundscapePlaying(false)

        return 0
      }
      return prev - 1
    })
  }, 1000)
}

  useEffect(() => {
  if (!isTimerRunning || timeLeft <= 0) return

  const interval = setInterval(() => {
    setTimeLeft((prev) => prev - 1)
  }, 1000)

  return () => clearInterval(interval)
}, [isTimerRunning, timeLeft])

 useEffect(() => {
 if (timeLeft === 0 && isTimerRunning) {
  setIsTimerRunning(false)
  setSelectedTimer(null)

  if (gainRef.current) {
    let volume = gainRef.current.gain.value

    const fadeOut = setInterval(() => {
      if (volume > 0) {
        volume -= 0.02
        gainRef.current!.gain.value = Math.max(volume, 0)
      } else {
        clearInterval(fadeOut)

        if (isPlaying) {
          toggle()
        }
      }
    }, 100)
  }
}

}, [timeLeft, isTimerRunning])
  const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (h > 0) {
    return `${h}h ${m}m ${s}s`
  }

  return `${m}m ${s}s`
}

  const [screen, setScreen] = useState<"select" | "player" | "soundscape" | "soundscapeEdit">("select");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSoundscapePlaying, setIsSoundscapePlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState<SoundName>("Rain");
  const [selectedMixSounds, setSelectedMixSounds] = useState<SoundName[]>([]);
  const [mixVolumes, setMixVolumes] = useState<Record<SoundName, number>>({
  Rain: 0.5,
  Wave: 0.5,
  River: 0.5,
  Bonfire: 0.5,
  Forest: 0.5,
  Noise: 0.5,
});
const toggleSound = (sound: SoundName) => {
  if (selectedMixSounds.includes(sound)) {
    setSelectedMixSounds(selectedMixSounds.filter((s) => s !== sound));
    return;
  }

  if (selectedMixSounds.length >= 2) {
    return;
  }

  setSelectedMixSounds([...selectedMixSounds, sound]);
};
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const mixAudioRefs = useRef<Partial<Record<SoundName, HTMLAudioElement>>>({});

  const startSoundscape = () => {
  stopSoundscape();

  selectedMixSounds.forEach((sound) => {
    const path = getSamplePathForMix(sound);
    if (!path) return;

    const audio = new Audio(path);

    audio.loop = true;
    audio.volume = 0;

    mixAudioRefs.current[sound] = audio;
    audio.play();

    // 👇フェードイン追加
let vol = 0;
const target = mixVolumes[sound];

const fadeIn = setInterval(() => {
  vol += 0.01;

  if (vol >= target) {
    audio.volume = target;
    clearInterval(fadeIn);
  } else {
    audio.volume = vol;
  }
}, 50);

  });
};
  const stopSoundscape = () => {
  Object.values(mixAudioRefs.current).forEach((audio) => {
    if (!audio) return;

    let vol = audio.volume;

    const fadeOut = setInterval(() => {
      vol -= 0.02;

      if (vol <= 0) {
        audio.volume = 0;
        clearInterval(fadeOut);
        audio.pause();
        audio.currentTime = 0;
      } else {
        audio.volume = vol;
      }
    }, 50);
  });

  mixAudioRefs.current = {};
};

const getSamplePathForMix = (sound: SoundName) => {
  switch (sound) {
    case "Rain":
      return "/sound/rain/rain_loop.wav";
    case "River":
      return "/sound/river/river_loop.wav";
    case "Forest":
      return "/sound/forest/forest_loop.wav";
    case "Bonfire":
      return "/sound/bonfire/bonfire_loop.wav";
    default:
      return null;
  }
};

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
  
  const createPinkNoise = (ctx: AudioContext) => {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let last = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;

    // 👇 ピンク寄りフィルター
    last = 0.98 * last + 0.02 * white;
    data[i] = last;

    // 👇 軽く丸める（重要）
    data[i] = Math.tanh(data[i]);
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
          title: "Noise",
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
            return null;
            default:
        return null;
    }
  };

    const stopRain = () => {
  if (intervalRef.current !== null) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  if (noiseRef.current && gainRef.current && audioCtxRef.current) {
  const ctx = audioCtxRef.current;
  const now = ctx.currentTime;

  // 👇 フェードアウト（2秒）
  gainRef.current.gain.linearRampToValueAtTime(0, now + 4);

  // 👇 Audioの時間で止める
  noiseRef.current.stop(now + 4);
}

  if (lowRef.current) {
    lowRef.current.stop();
    lowRef.current.disconnect();
    lowRef.current = null;
  }

    // 👇 これ追加
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
    noise.buffer =
      selectedSound === "Noise" ? createPinkNoise(ctx) : createNoise(ctx);
    
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

   if (selectedSound === "Noise") {
   filter.frequency.value = 2000;
  } else {
   filter.frequency.value = sound.frequency;
  }

    const gain = ctx.createGain(); 

    // 👇 最終目標値を先に決める
    const targetGain =
    selectedSound === "Noise" ? 0.05 : sound.gain;

    gainRef.current = gain;

    const now = ctx.currentTime;

    // 👇 無音スタート
     gain.gain.setValueAtTime(0, now);

    // 👇 フェードイン
     gain.gain.linearRampToValueAtTime(targetGain, now + 3);


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
            </div>

            <button
             onClick={() => setScreen("player")}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-sky-300 to-indigo-400 py-4 text-base font-medium text-slate-900 shadow-lg shadow-sky-500/30 transition hover:scale-[1.02] active:scale-[0.98]"
              >
              Continue with {selectedSound}
            </button>



            <button
              onClick={() => setScreen("soundscape")}
              className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
              >
            <div>
              <p className="text-sm font-medium text-white/85">
               Create Soundscape
             </p>
             <p className="text-xs text-white/45">
              Build your own ambient world
             </p>
         </div>
           </button>
        </div>
      </div>
    </div>  
    )
  }

             if (screen === "soundscape") {
              return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2a44_0%,_#0d1321_45%,_#05070d_100%)] text-white flex items-center justify-center p-6 overflow-hidden">
      <div className="relative w-full max-w-sm min-h-[720px] rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">

        {/* 👇ここに追加（Backボタン） */}
        <div className="px-6 pt-6">
          <button
            onClick={() => setScreen("player")}
            className="text-sm text-white/60"
          >
            ← Back
          </button>
        </div>

        {/* 👇タイトル */}
        <div className="px-6 pt-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-white/45">
            My Sleep App
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Create Soundscape
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Mix your own ambient world
          </p>

         <p className="mt-2 text-sm text-sky-200">
         {selectedMixSounds.join(" + ")}
         </p>
          </div>

        {/* 👇サウンド選択 */}
         <div className="px-6 pb-6">
  <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-lg">

  <p className="mb-4 text-xs text-white/40 text-center">
    Choose up to 2 sounds
  </p>


    <div className="grid grid-cols-3 gap-4">
      {sounds.map((item) => {
        const Icon = item.icon;
        const isSelected = selectedMixSounds.includes(item.name);

        return (
          <button
            key={item.name}
            onClick={() => toggleSound(item.name)}
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

    {selectedMixSounds.length === 2 && (
  <button
    onClick={() => setScreen("soundscapeEdit")}
    className="mt-6 w-full rounded-2xl bg-gradient-to-r from-sky-300 to-indigo-400 py-4 text-base font-medium text-slate-900 shadow-lg shadow-sky-500/30"
  >
    Continue
  </button>
)}

  </div> 
</div>



        </div>   
      </div>
  );
}

if (screen === "soundscapeEdit") {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2a44_0%,_#0d1321_45%,_#05070d_100%)] text-white flex items-center justify-center p-6 overflow-hidden">
      <div className="relative w-full max-w-sm min-h-[720px] rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6">
          <button
            onClick={() => setScreen("soundscape")}
            className="text-sm text-white/60"
          >
            ← Back
          </button>
        </div>

        <div className="px-6 pt-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-white/45">
            My Sleep App
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Create Soundscape
          </h1>
          <p className="mt-2 text-sm text-sky-200">
            {selectedMixSounds.join(" + ")}
          </p>
        </div>

        <div className="px-6 pb-6">
          <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-lg space-y-5">
              <div className="text-sm text-white/75 text-center">
              Mix your sound
              </div>
            {selectedMixSounds.map((sound) => (
              <div key={sound}>
                <div className="mb-2 flex justify-between text-sm text-white/75">
                  <span>{sound}</span>
                  <span className="text-white/40">
                    {Math.round(mixVolumes[sound] * 100)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={mixVolumes[sound]}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setMixVolumes({
                      ...mixVolumes,
                      [sound]: value,
                    });

                    if (mixAudioRefs.current[sound]) {
                      mixAudioRefs.current[sound]!.volume = value;
                    }
                  }}
                  className="w-full accent-sky-300"
                />
              </div>
            ))}  
          </div>
 {/* 👇 Sleep Timer（ここに追加） */}
<div className="mt-6">
  <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-lg space-y-4">
    
    <div className="text-sm text-white/75 text-center">
      Sleep with this soundscape
    </div>

    <div className="grid grid-cols-3 gap-2">

      <button onClick={() => startSoundscapeTimer(30)} className={`rounded-xl border py-2 text-sm transition ${selectedSoundscapeTimer === 30 && soundscapeTimeLeft > 0 ? "border-sky-300/50 bg-sky-300/20 text-sky-200" : "border-white/10 bg-white/5 text-white/75"}`}>
        {selectedSoundscapeTimer === 30 && soundscapeTimeLeft > 0 ? formatTime(soundscapeTimeLeft) : "30m"}
      </button>

      <button onClick={() => startSoundscapeTimer(60)} className={`rounded-xl border py-2 text-sm transition ${selectedSoundscapeTimer === 60 && soundscapeTimeLeft > 0 ? "border-sky-300/50 bg-sky-300/20 text-sky-200" : "border-white/10 bg-white/5 text-white/75"}`}>
        {selectedSoundscapeTimer === 60 && soundscapeTimeLeft > 0 ? formatTime(soundscapeTimeLeft) : "60m"}
      </button>

      <button onClick={() => startSoundscapeTimer(120)} className={`rounded-xl border py-2 text-sm transition ${selectedSoundscapeTimer === 120 && soundscapeTimeLeft > 0 ? "border-sky-300/50 bg-sky-300/20 text-sky-200" : "border-white/10 bg-white/5 text-white/75"}`}>
        {selectedSoundscapeTimer === 120 && soundscapeTimeLeft > 0 ? formatTime(soundscapeTimeLeft) : "2h"}
      </button>

      <button onClick={() => startSoundscapeTimer(180)} className={`rounded-xl border py-2 text-sm transition ${selectedSoundscapeTimer === 180 && soundscapeTimeLeft > 0 ? "border-sky-300/50 bg-sky-300/20 text-sky-200" : "border-white/10 bg-white/5 text-white/45"}`}>
        {selectedSoundscapeTimer === 180 && soundscapeTimeLeft > 0 ? formatTime(soundscapeTimeLeft) : "3h"}
      </button>

      <button onClick={() => startSoundscapeTimer(360)} className={`rounded-xl border py-2 text-sm transition ${selectedSoundscapeTimer === 360 && soundscapeTimeLeft > 0 ? "border-sky-300/50 bg-sky-300/20 text-sky-200" : "border-white/10 bg-white/5 text-white/45"}`}>
        {selectedSoundscapeTimer === 360 && soundscapeTimeLeft > 0 ? formatTime(soundscapeTimeLeft) : "6h"}
      </button>

      <button onClick={() => startSoundscapeTimer(480)} className={`rounded-xl border py-2 text-sm transition ${selectedSoundscapeTimer === 480 && soundscapeTimeLeft > 0 ? "border-sky-300/50 bg-sky-300/20 text-sky-200" : "border-white/10 bg-white/5 text-white/45"}`}>
        {selectedSoundscapeTimer === 480 && soundscapeTimeLeft > 0 ? formatTime(soundscapeTimeLeft) : "8h"}
      </button>

    </div>

  </div>
</div>
          {/* 👇ここに追加 */}
{/*<button
  onClick={() => {
    if (isSoundscapePlaying) {
      stopSoundscape();
      setIsSoundscapePlaying(false);
    } else {
      startSoundscape();
      setIsSoundscapePlaying(true);
    }
  }}
  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-sky-300 to-indigo-400 py-4 text-base font-medium text-slate-900 shadow-lg shadow-sky-500/30"
>
  {isSoundscapePlaying ? "Stop" : "Play Soundscape"}
</button>
*/}

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
            {/*
            <button
              onClick={toggle}
              className="w-full rounded-2xl bg-gradient-to-r from-sky-300 to-indigo-400 py-4 text-base font-medium text-slate-900 shadow-lg shadow-sky-500/30 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              {isPlaying ? "Pause" : `Play ${selectedSound}`}
            </button>

          */}
            
            {/* DEV ONLY: manual test trigger */}
            {/* 
            <button
            onClick={playChapu}
             className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-white/75"
            >
            Test Chapu
            </button>
            */}
           
            <div className="mt-5">
  <div className="pb-8 text-sm text-white/75 text-center ">
    Sleep with this sound
  </div>

  <div className="grid grid-cols-3 gap-2">
<button
  type="button"
  onClick={() => startSleepTimer(30)}
  className={`rounded-xl border py-2.5 text-sm transition ${
    selectedTimer === 30 && timeLeft > 0
      ? "border-sky-300/50 bg-sky-300/20 text-sky-200"
      : "border-white/10 bg-white/5 text-white/75"
  }`}
>
  {selectedTimer === 30 && timeLeft > 0 ? formatTime(timeLeft) : "30m"}
</button>

<button
  type="button"
  onClick={() => startSleepTimer(60)}
  className={`rounded-xl border py-2.5 text-sm transition ${
  selectedTimer === 60 && timeLeft > 0
    ? "border-sky-300/50 bg-sky-300/20 text-sky-200"
    : "border-white/10 bg-white/5 text-white/75"
}`}
>
  {selectedTimer === 60 && timeLeft > 0 ? formatTime(timeLeft) : "60m"}
</button>

<button
  type="button"
  onClick={() => startSleepTimer(120)}
  className={`rounded-xl border py-2.5 text-sm transition ${
  selectedTimer === 120 && timeLeft > 0
    ? "border-sky-300/50 bg-sky-300/20 text-sky-200"
    : "border-white/10 bg-white/5 text-white/75"
}`}
>
  {selectedTimer === 120 && timeLeft > 0 ? formatTime(timeLeft) : "2h"}
</button>
  </div>
</div>

<div className="mt-2 grid grid-cols-3 gap-2">
  <button
    type="button"
    onClick={() => startSleepTimer(180)}
    className={`rounded-xl border py-2.5 text-sm transition ${
  selectedTimer === 180 && timeLeft > 0
    ? "border-sky-300/50 bg-sky-300/20 text-sky-200"
    : "border-white/10 bg-white/5 text-white/45"
}`}
  >
    {selectedTimer === 180 && timeLeft > 0 ? formatTime(timeLeft) : "3h"}
  </button>

  <button
    type="button"
    onClick={() => startSleepTimer(360)}
    className={`rounded-xl border py-2.5 text-sm transition ${
  selectedTimer === 360 && timeLeft > 0
    ? "border-sky-300/50 bg-sky-300/20 text-sky-200"
    : "border-white/10 bg-white/5 text-white/45"
}`}
  >
    {selectedTimer === 360 && timeLeft > 0 ? formatTime(timeLeft) : "6h"}
  </button>

  <button
    type="button"
    onClick={() => startSleepTimer(480)}
    className={`rounded-xl border py-2.5 text-sm transition ${
  selectedTimer === 480 && timeLeft > 0
    ? "border-sky-300/50 bg-sky-300/20 text-sky-200"
    : "border-white/10 bg-white/5 text-white/45"
}`}
  >
    {selectedTimer === 480 && timeLeft > 0 ? formatTime(timeLeft) : "8h"}
  </button>
</div>



{false && (
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
)}
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
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}