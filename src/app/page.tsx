"use client";

import { useRef, useState, useEffect, type CSSProperties } from "react";
import {
  CloudRain,
  Waves,
  Trees,
  Flame,
  Wind,
  Mountain,
  Play,
  Square,
  Shield,
  FileText,
  Heart,
  Wrench,
} from "lucide-react";

import { Howl, Howler } from "howler";

Howler.autoSuspend = false;

type SoundName = "Rain" | "Wave" | "River" | "Bonfire" | "Forest" | "Cave";

const MOBILE_MIX_DURATION_SECONDS = 30;
const MOBILE_MIX_SAMPLE_RATE = 44100;
const MOBILE_MIX_TRANSITION_SECONDS = 0.8;
const ANDROID_LOOP_CROSSFADE_SECONDS = 1.2;
const ANDROID_SOUNDSCAPE_STAGGER_RATIO = 0.5;

type AndroidMediaPair = {
  elements: [HTMLAudioElement, HTMLAudioElement];
  activeIndex: 0 | 1;
  transitioning: boolean;
  volume: number;
};

function audioBufferToWav(buffer: AudioBuffer) {
  const channelCount = Math.min(buffer.numberOfChannels, 2);
  const frameCount = buffer.length;
  const bytesPerSample = 2;
  const dataSize = frameCount * channelCount * bytesPerSample;
  const wav = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wav);

  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index++) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(
    28,
    buffer.sampleRate * channelCount * bytesPerSample,
    true,
  );
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeText(36, "data");
  view.setUint32(40, dataSize, true);

  const channels = Array.from({ length: channelCount }, (_, channel) =>
    buffer.getChannelData(channel),
  );
  let offset = 44;

  for (let frame = 0; frame < frameCount; frame++) {
    for (let channel = 0; channel < channelCount; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += bytesPerSample;
    }
  }

  return wav;
}

const sounds: {
  name: SoundName;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { name: "Rain", icon: CloudRain },
  { name: "Wave", icon: Wind },
  { name: "River", icon: Waves },
  { name: "Bonfire", icon: Flame },
  { name: "Forest", icon: Trees },
  { name: "Cave", icon: Mountain },
];

function HibikiLogo() {
  return (
    <div className="mx-auto h-24 w-24 flex items-center justify-center">
      <img
        src="/logo/hibiki-enso.png"
        alt="HIBIKI"
        className="hibiki-breathe h-full w-full object-contain"
      />
    </div>
  );
}

export default function Home() {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [selectedTimer, setSelectedTimer] = useState<number | null>(null);

  const [soundscapeTimeLeft, setSoundscapeTimeLeft] = useState<number>(0);
  const [screen, setScreen] = useState<
    | "select"
    | "player"
    | "soundscape"
    | "soundscapeEdit"
    | "info"
    | "privacy"
    | "terms"
    | "devlog"
  >("select");

  const [selectedSoundscapeTimer, setSelectedSoundscapeTimer] = useState<
    number | null
  >(null);
  const waveAudioRef = useRef<HTMLAudioElement[]>([]);
  const forestHowlsRef = useRef<
    { sound: Howl; id: number | null; name: "a1" | "b1" | "c1" | "a2" | "a3" }[]
  >([]);
  const waveHowlsRef = useRef<
    { sound: Howl; id: number | null; name: "a1" | "b1" | "c1" | "a2" | "a3" }[]
  >([]);
  const riverHowlsRef = useRef<
    { sound: Howl; id: number | null; name: "a1" | "b1" | "c1" | "a2" | "a3" }[]
  >([]);
  const rainHowlsRef = useRef<
    { sound: Howl; id: number | null; name: "a1" | "b1" | "c1" | "a2" | "a3" }[]
  >([]);
  const bonfireHowlsRef = useRef<
    { sound: Howl; id: number | null; name: "a1" | "b1" | "c1" }[]
  >([]);
  const caveHowlsRef = useRef<
    { sound: Howl; id: number | null; name: "a1" | "b1" | "c1" }[]
  >([]);

  const stopHowlEntries = (
    entries: { sound: Howl; id: number | null; name: string }[],
    category: string,
  ) => {
    entries.forEach(({ sound, id, name }) => {
      if (id === null) {
        sound.stop();
        return;
      }
      sound.stop(id);
    });
  };

  const silentKeeperRef = useRef<Howl | null>(null);
  const mediaAnchorRef = useRef<HTMLAudioElement | null>(null);
  const androidMediaPairsRef = useRef<
    Partial<Record<SoundName, AndroidMediaPair>>
  >({});

  const fluctuationRef = useRef<number | null>(null);
  const [debugTimeSec, setDebugTimeSec] = useState(0);
  const [debugInputSec, setDebugInputSec] = useState("");

  const LAYERS = ["a1", "b1", "c1"];

  // =====================================================
  // Desktop Layer Volume Map
  //
  // PC / Mac 用音量バランス
  //
  // Wave / Rain / River / Forest / Bonfire / Cave
  // ごとに独立調整可能。
  //
  // Desktop実機テスト時はここを調整する。
  // =====================================================

  const VOLUME_MAP_DESKTOP = {
    wave: { a1: 0.15, b1: 0.0, c1: 0.15, a2: 0.5, a3: 0.5 },
    forest: { a1: 0.06, b1: 0.06, c1: 0.2, a2: 0.14, a3: 0.1 },
    rain: { a1: 0.35, b1: 0.18, c1: 0.11, a2: 0.19, a3: 0.1 },
    cave: { a1: 0.01, b1: 0.28, c1: 0.22 },
    bonfire: { a1: 0.37, b1: 0.56, c1: 0.48 },
    river: { a1: 0.13, b1: 0.13, c1: 0.13, a2: 0.13, a3: 0.07 },
  };

  // =====================================================
  // Mobile Layer Volume Map
  //
  // iPhone / Android / iPad 用音量バランス
  //
  // Wave / Rain / River / Forest / Bonfire / Cave
  // ごとに独立調整可能。
  //
  // Mobile実機テスト時はここを調整する。
  // =====================================================

  const VOLUME_MAP_MOBILE = {
    wave: { a1: 0.14, b1: 0.0, c1: 0.14, a2: 0.46, a3: 0.46 },
    forest: { a1: 0.04, b1: 0.04, c1: 0.14, a2: 0.11, a3: 0.07 },
    rain: { a1: 0.3, b1: 0.16, c1: 0.1, a2: 0.17, a3: 0.09 },
    cave: { a1: 0.01, b1: 0.2, c1: 0.16 },
    bonfire: { a1: 0.37, b1: 0.56, c1: 0.48 },
    river: { a1: 0.1, b1: 0.1, c1: 0.1, a2: 0.1, a3: 0.05 },
  };

  const isAndroid =
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  const isMobile = isAndroid || isIOS;

  const ACTIVE_VOLUME_MAP = isMobile ? VOLUME_MAP_MOBILE : VOLUME_MAP_DESKTOP;

  const clearAndroidMediaAudio = () => {
    Object.values(androidMediaPairsRef.current).forEach((pair) => {
      pair?.elements.forEach((audio) => {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audio.remove();
      });
    });
    androidMediaPairsRef.current = {};
  };

  const createAndroidMediaElement = (sound: SoundName) => {
    const audio = document.createElement("audio");
    audio.src = `/sound/mixes/android/${sound.toLowerCase()}.webm`;
    audio.loop = false;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("aria-hidden", "true");
    audio.style.position = "fixed";
    audio.style.width = "1px";
    audio.style.height = "1px";
    audio.style.opacity = "0";
    audio.style.pointerEvents = "none";
    document.body.appendChild(audio);
    return audio;
  };

  const createAndroidMediaPair = (sound: SoundName, volume: number) => {
    const pair: AndroidMediaPair = {
      elements: [
        createAndroidMediaElement(sound),
        createAndroidMediaElement(sound),
      ],
      activeIndex: 0,
      transitioning: false,
      volume,
    };

    const handleTimeUpdate = (audio: HTMLAudioElement) => {
      const active = pair.elements[pair.activeIndex];
      if (audio !== active || !Number.isFinite(active.duration)) return;

      const remaining = active.duration - active.currentTime;
      if (remaining > ANDROID_LOOP_CROSSFADE_SECONDS) return;

      const standbyIndex = pair.activeIndex === 0 ? 1 : 0;
      const standby = pair.elements[standbyIndex];

      if (!pair.transitioning) {
        pair.transitioning = true;
        standby.currentTime = 0;
        standby.volume = 0;
        standby.muted = pair.volume <= 0;
        standby.play().catch((error) => {
          console.log("[android loop overlap error]", sound, error);
        });
      }

      const progress = Math.min(
        Math.max(
          (ANDROID_LOOP_CROSSFADE_SECONDS - remaining) /
            ANDROID_LOOP_CROSSFADE_SECONDS,
          0,
        ),
        1,
      );
      const fadeAngle = progress * (Math.PI / 2);
      active.volume = pair.volume * Math.cos(fadeAngle);
      standby.volume = pair.volume * Math.sin(fadeAngle);
    };

    const handleEnded = (audio: HTMLAudioElement) => {
      const active = pair.elements[pair.activeIndex];
      if (audio !== active) return;

      const oldActiveIndex = pair.activeIndex;
      const nextActiveIndex = oldActiveIndex === 0 ? 1 : 0;
      const nextActive = pair.elements[nextActiveIndex];

      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
      pair.activeIndex = nextActiveIndex;
      pair.transitioning = false;
      nextActive.muted = pair.volume <= 0;
      nextActive.volume = pair.volume;

      if (nextActive.paused) {
        nextActive.play().catch((error) => {
          console.log("[android loop fallback error]", sound, error);
        });
      }
    };

    pair.elements.forEach((audio) => {
      audio.addEventListener("timeupdate", () => handleTimeUpdate(audio));
      audio.addEventListener("ended", () => handleEnded(audio));
    });
    pair.elements[0].volume = volume;
    pair.elements[1].volume = 0;
    androidMediaPairsRef.current[sound] = pair;
    return pair;
  };

  const stopForestHowls = () => {
    stopHowlEntries(forestHowlsRef.current, "forest");
  };

  const stopWaveHowls = () => {
    stopHowlEntries(waveHowlsRef.current, "wave");
  };

  const stopRiverHowls = () => {
    stopHowlEntries(riverHowlsRef.current, "river");
  };

  const stopRainHowls = () => {
    stopHowlEntries(rainHowlsRef.current, "rain");
  };

  const stopBonfireHowls = () => {
    stopHowlEntries(bonfireHowlsRef.current, "bonfire");
  };

  const stopCaveHowls = () => {
    stopHowlEntries(caveHowlsRef.current, "cave");
  };

  const prepareForestHowls = () => {
    if (forestHowlsRef.current.length > 0) return;

    const forestLayers = ["a1", "b1", "c1", "a2", "a3"] as const;

    const sounds = forestLayers.map((name) => ({
      sound: new Howl({
        src: [`/sound/forest/v1/${name}.wav`],
        loop: true,
        volume: 0,
        html5: true,
        preload: true,

        onload: () => {
          console.log("[forest loaded]", name);
        },

        onloaderror: (_, error) => {
          console.log("[forest load error]", name, error);
        },
      }),
      id: null as number | null,
      name,
    }));

    forestHowlsRef.current = sounds;
  };

  const prepareWaveHowls = () => {
    if (waveHowlsRef.current.length > 0) return;

    const waveLayers = ["a1", "b1", "c1", "a2", "a3"] as const;

    const sounds = waveLayers.map((name) => ({
      sound: new Howl({
        src: [`/sound/wave/v1/${name}.wav`],
        loop: true,
        volume: 0,
        html5: true,
        preload: true,

        onload: () => {
          console.log("[wave loaded]", name);
        },

        onloaderror: (_, error) => {
          console.log("[wave load error]", name, error);
        },
      }),
      id: null as number | null,
      name,
    }));

    waveHowlsRef.current = sounds;
  };

  const prepareRiverHowls = () => {
    if (riverHowlsRef.current.length > 0) return;

    const riverLayers = ["a1", "b1", "c1", "a2", "a3"] as const;

    const sounds = riverLayers.map((name) => ({
      sound: new Howl({
        src: [`/sound/river/v1/${name}.wav`],
        loop: true,
        volume: 0,
        html5: true,
        preload: true,

        onload: () => {
          console.log("[river loaded]", name);
        },

        onloaderror: (_, error) => {
          console.log("[river load error]", name, error);
        },
      }),
      id: null as number | null,
      name,
    }));

    riverHowlsRef.current = sounds;
  };

  const prepareRainHowls = () => {
    if (rainHowlsRef.current.length > 0) return;

    const rainLayers = ["a1", "b1", "c1", "a2", "a3"] as const;

    const sounds = rainLayers.map((name) => ({
      sound: new Howl({
        src: [`/sound/rain/v1/${name}.wav`],
        loop: true,
        volume: 0,
        html5: true,
        preload: true,

        onload: () => {
          console.log("[rain loaded]", name);
        },

        onloaderror: (_, error) => {
          console.log("[rain load error]", name, error);
        },
      }),
      id: null as number | null,
      name,
    }));

    rainHowlsRef.current = sounds;
  };

  const prepareBonfireHowls = () => {
    if (bonfireHowlsRef.current.length > 0) return;

    const bonfireLayers = ["a1", "b1", "c1"] as const;

    const sounds = bonfireLayers.map((name) => ({
      sound: new Howl({
        src: [`/sound/bonfire/v1/${name}.wav`],
        loop: true,
        volume: 0,
        html5: true,
        preload: true,

        onload: () => {
          console.log("[bonfire loaded]", name);
        },

        onloaderror: (_, error) => {
          console.log("[bonfire load error]", name, error);
        },
      }),
      id: null as number | null,
      name,
    }));

    bonfireHowlsRef.current = sounds;
  };

  const prepareCaveHowls = () => {
    if (caveHowlsRef.current.length > 0) return;

    const caveLayers = ["a1", "b1", "c1"] as const;

    const sounds = caveLayers.map((name) => ({
      sound: new Howl({
        src: [`/sound/cave/v1/${name}.wav`],
        loop: true,
        volume: 0,
        html5: true,
        preload: true,

        onload: () => {
          console.log("[cave loaded]", name);
        },

        onloaderror: (_, error) => {
          console.log("[cave load error]", name, error);
        },
      }),
      id: null as number | null,
      name,
    }));

    caveHowlsRef.current = sounds;
  };

  const unlockHowlerAudio = async () => {
    if (Howler.ctx && Howler.ctx.state !== "running") {
      await Howler.ctx.resume();
    }
  };

  const startSilentKeeper = () => {
    if (silentKeeperRef.current) return;

    if (!mediaAnchorRef.current) {
      const audio = new Audio("/sound/silence.mp3");
      audio.loop = true;
      audio.volume = 0.01;
      audio.preload = "auto";
      audio.setAttribute("playsinline", "true");

      mediaAnchorRef.current = audio;
    }

    mediaAnchorRef.current.play().catch((error) => {
      console.log("[mediaAnchor]", error);
    });

    silentKeeperRef.current = new Howl({
      src: ["/sound/silence.mp3"],
      loop: true,
      volume: 0.005,
      html5: true,
      preload: true,
    });

    silentKeeperRef.current.play();
  };

  const stopSilentKeeper = () => {
    if (mediaAnchorRef.current) {
      mediaAnchorRef.current.pause();
      mediaAnchorRef.current.currentTime = 0;
    }

    if (!silentKeeperRef.current) return;

    silentKeeperRef.current.stop();
    silentKeeperRef.current.unload();
    silentKeeperRef.current = null;
  };

  const playWaveLayerTest = async () => {
    console.log("RUNNING playWaveLayerTest");

    if (isAndroid) {
      clearAndroidMediaAudio();
      if (!selectedSound) return;

      const pair = createAndroidMediaPair(selectedSound, 1);
      pair.elements[pair.activeIndex].play().catch((error) => {
        console.log("[android single preset play error]", error);
      });
      return;
    }

    await unlockHowlerAudio();
    startSilentKeeper();

    waveAudioRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });

    waveAudioRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    });

    waveAudioRef.current = [];

    if (!selectedSound) return;

    const folder = selectedSound.toLowerCase();

    if (folder === "forest") {
      if (forestHowlsRef.current.length === 0) {
        prepareForestHowls();
      }

      const forestVolMap = ACTIVE_VOLUME_MAP.forest;

      forestHowlsRef.current.forEach((entry) => {
        const targetVolume = forestVolMap[entry.name] ?? 0;

        entry.sound.mute(false);
        entry.sound.volume(targetVolume);

        const id = entry.sound.play();
        entry.id = id;

        entry.sound.volume(targetVolume, id);
      });

      return;
    }

    if (folder === "wave") {
      if (waveHowlsRef.current.length === 0) {
        prepareWaveHowls();
      }

      const waveVolMap = ACTIVE_VOLUME_MAP.wave;

      waveHowlsRef.current.forEach((entry) => {
        const targetVolume = waveVolMap[entry.name] ?? 0;

        entry.sound.mute(false);
        entry.sound.volume(targetVolume);

        const id = entry.sound.play();
        entry.id = id;

        entry.sound.volume(targetVolume, id);
      });

      return;
    }

    if (folder === "river") {
      if (riverHowlsRef.current.length === 0) {
        prepareRiverHowls();
      }

      const riverVolMap = ACTIVE_VOLUME_MAP.river;

      riverHowlsRef.current.forEach((entry) => {
        const targetVolume = riverVolMap[entry.name] ?? 0;

        entry.sound.mute(false);
        entry.sound.volume(targetVolume);

        const id = entry.sound.play();
        entry.id = id;

        entry.sound.volume(targetVolume, id);
      });

      return;
    }

    if (folder === "rain") {
      if (rainHowlsRef.current.length === 0) {
        prepareRainHowls();
      }

      const rainVolMap = ACTIVE_VOLUME_MAP.rain;

      rainHowlsRef.current.forEach((entry) => {
        const targetVolume = rainVolMap[entry.name] ?? 0;

        entry.sound.mute(false);
        entry.sound.volume(targetVolume);

        const id = entry.sound.play();
        entry.id = id;

        entry.sound.volume(targetVolume, id);
      });

      return;
    }

    if (folder === "bonfire") {
      if (bonfireHowlsRef.current.length === 0) {
        prepareBonfireHowls();
      }

      const bonfireVolMap = ACTIVE_VOLUME_MAP.bonfire;

      bonfireHowlsRef.current.forEach((entry) => {
        const targetVolume = bonfireVolMap[entry.name] ?? 0;

        entry.sound.mute(false);
        entry.sound.volume(targetVolume);

        const id = entry.sound.play();
        entry.id = id;

        entry.sound.volume(targetVolume, id);
      });

      return;
    }

    if (folder === "cave") {
      if (caveHowlsRef.current.length === 0) {
        prepareCaveHowls();
      }

      const caveVolMap = ACTIVE_VOLUME_MAP.cave;

      caveHowlsRef.current.forEach((entry) => {
        const targetVolume = caveVolMap[entry.name] ?? 0;

        entry.sound.mute(false);
        entry.sound.volume(targetVolume);

        const id = entry.sound.play();
        entry.id = id;

        entry.sound.volume(targetVolume, id);
      });

      return;
    }
  };

  // 👇開発用時間スライダー
  const jumpWaveToTime = (sec: number) => {
    waveAudioRef.current.forEach((audio) => {
      if (!audio) return;
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

      audio.currentTime = sec % audio.duration;
      audio.play();
    });
  };

  const stopWaveLayerTest = () => {
    if (isAndroid) {
      clearAndroidMediaAudio();
    }

    if (fluctuationRef.current !== null) {
      clearInterval(fluctuationRef.current);
      fluctuationRef.current = null;
    }

    const audios = [...waveAudioRef.current];

    audios.forEach((audio) => {
      audio.volume = 0;
      audio.pause();
      audio.currentTime = 0;

      waveAudioRef.current = waveAudioRef.current.filter(
        (item) => item !== audio,
      );
    });
  };

  const pauseWaveLayerTestImmediately = () => {
    clearAndroidMediaAudio();
    stopSilentKeeper();

    stopForestHowls();
    stopWaveHowls();
    stopRiverHowls();
    stopRainHowls();
    stopBonfireHowls();
    stopCaveHowls();

    waveAudioRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });

    waveAudioRef.current = [];
  };

  const startSleepTimer = (minutes: number) => {
    const isSameTimer = selectedTimer === minutes && isTimerRunning;

    if (isSameTimer) {
      pauseWaveLayerTestImmediately();

      setIsPlaying(false);
      setIsTimerRunning(false);
      setTimeLeft(0);
      setSelectedTimer(null);

      return;
    }

    setSelectedTimer(minutes);
    setTimeLeft(minutes * 60 - 1);
    setIsTimerRunning(true);

    if (isPlaying) {
      pauseWaveLayerTestImmediately();
    }

    playWaveLayerTest();
    setIsPlaying(true);
  };

  /* 👇ここに追加（この位置が正解） */
  const startSoundscapeTimer = (minutes: number) => {
    if (isMobile && !isMobileMixReady) return;

    const isSameTimer =
      selectedSoundscapeTimer === minutes && isSoundscapeTimerRunning;

    if (isSameTimer) {
      setIsSoundscapeTimerRunning(false);
      setSoundscapeTimeLeft(0);
      setSelectedSoundscapeTimer(null);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (isSoundscapePlaying) {
        stopCurrentSoundscapePlayback();
        setIsSoundscapePlaying(false);
      }

      return;
    }
    setSelectedSoundscapeTimer(minutes);
    setSoundscapeTimeLeft(minutes * 60);
    setIsSoundscapeTimerRunning(true);

    stopCurrentSoundscapePlayback();
    startSoundscape();
    setIsSoundscapePlaying(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setSoundscapeTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);

          stopSoundscape();
          setIsSoundscapePlaying(false);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!isTimerRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setSelectedTimer(null);

      pauseWaveLayerTestImmediately();
      setIsPlaying(false);
    }
  }, [timeLeft, isTimerRunning]);

  useEffect(() => {
    const resumeAudioContext = () => {
      if (Howler.ctx && Howler.ctx.state === "suspended") {
        Howler.ctx.resume();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resumeAudioContext();
      }
    };

    const handlePageShow = () => {
      resumeAudioContext();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    if (h > 0) {
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }

    return `${m}m`;
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [isSoundscapePlaying, setIsSoundscapePlaying] = useState(false);
  const [isSoundscapeTimerRunning, setIsSoundscapeTimerRunning] =
    useState(false);
  const [selectedSound, setSelectedSound] = useState<SoundName | null>(null);
  const [isSafariBrowser, setIsSafariBrowser] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);

  const [cardScale, setCardScale] = useState(1);

  useEffect(() => {
    const updateCardScale = () => {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;

      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;

      const scaleByWidth = (viewportWidth - 48) / 384;
      const scaleByHeight = (viewportHeight - 96) / 740;

      const nextScale = Math.max(
        0.56,
        Math.min(1, scaleByWidth, scaleByHeight),
      );

      setCardScale(nextScale);
    };

    updateCardScale();

    window.addEventListener("resize", updateCardScale);
    window.visualViewport?.addEventListener("resize", updateCardScale);

    return () => {
      window.removeEventListener("resize", updateCardScale);
      window.visualViewport?.removeEventListener("resize", updateCardScale);
    };
  }, []);

  type HibikiShellStyle = CSSProperties & {
    "--hibiki-card-scale": number;
    "--hibiki-stage-width": string;
    "--hibiki-stage-height": string;
  };

  const hibikiShellStyle: HibikiShellStyle = {
    "--hibiki-card-scale": cardScale,
    "--hibiki-stage-width": `${384 * cardScale}px`,
    "--hibiki-stage-height": `${740 * cardScale}px`,
  };

  useEffect(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari standalone
      window.navigator.standalone === true;

    setIsStandaloneApp(isStandalone);

    setIsSafariBrowser(isSafari && !isStandalone);
  }, []);

  const backgroundNames = [
    "rain",
    "wave",
    "river",
    "bonfire",
    "forest",
    "cave",
  ];

  const [selectBackground, setSelectBackground] = useState(
    () => backgroundNames[Math.floor(Math.random() * backgroundNames.length)],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setSelectBackground(
        backgroundNames[Math.floor(Math.random() * backgroundNames.length)],
      );
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const [playerVolume, setPlayerVolume] = useState(0.3);
  const [selectedMixSounds, setSelectedMixSounds] = useState<SoundName[]>([]);
  const [isSoundscapeReady, setIsSoundscapeReady] = useState(false);
  const [soundscapeLoadedCount, setSoundscapeLoadedCount] = useState(0);
  const [soundscapeTotalCount, setSoundscapeTotalCount] = useState(0);

  const [mixVolumes, setMixVolumes] = useState<Record<SoundName, number>>({
    Rain: 0.5,
    Wave: 0.5,
    River: 0.5,
    Bonfire: 0.5,
    Forest: 0.5,
    Cave: 0.5,
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

  const mobilePresetBuffersRef = useRef<Partial<Record<SoundName, AudioBuffer>>>(
    {},
  );
  const mobileMixRenderRef = useRef(0);
  const mobileMixDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const mobileMixHowlRef = useRef<{
    sound: Howl;
    id: number | null;
    url: string;
  } | null>(null);
  const mobilePendingMixHowlRef = useRef<{
    sound: Howl;
    id: number | null;
    url: string;
  } | null>(null);
  const mobileRenderedVolumesRef = useRef<Record<SoundName, number> | null>(
    null,
  );
  const [isMobileMixReady, setIsMobileMixReady] = useState(false);

  const mixAudioRefs = useRef<Partial<Record<SoundName, HTMLAudioElement[]>>>(
    {},
  );
  const mixHowlsRef = useRef<
    Partial<
      Record<
        SoundName,
        {
          sound: Howl;
          id: number | null;
          name: "a1" | "b1" | "c1" | "a2" | "a3";
        }[]
      >
    >
  >({});

  const clearAndroidSoundscape = () => {
    clearAndroidMediaAudio();
  };

  const prepareAndroidSoundscape = (
    selectedSounds: SoundName[],
    volumes: Record<SoundName, number>,
  ) => {
    if (!isAndroid || selectedSounds.length !== 2) return;

    clearAndroidSoundscape();
    setIsMobileMixReady(false);
    let loadedCount = 0;

    selectedSounds.forEach((sound) => {
      const pair = createAndroidMediaPair(sound, volumes[sound]);
      const active = pair.elements[pair.activeIndex];
      active.addEventListener(
        "canplay",
        () => {
          loadedCount++;
          if (loadedCount === selectedSounds.length) {
            setIsMobileMixReady(true);
          }
        },
        { once: true },
      );
      active.addEventListener(
        "error",
        () => {
          console.log("[android mix load error]", sound, active.error);
          setIsMobileMixReady(false);
        },
        { once: true },
      );
      pair.elements.forEach((audio) => audio.load());
    });
  };

  const applyAndroidMixVolume = (sound: SoundName, value: number) => {
    const pair = androidMediaPairsRef.current[sound];
    if (!pair) return;

    pair.volume = value;
    const active = pair.elements[pair.activeIndex];
    const standby = pair.elements[pair.activeIndex === 0 ? 1 : 0];
    pair.elements.forEach((audio) => {
      audio.muted = value <= 0;
    });

    if (!pair.transitioning) {
      active.volume = value;
      standby.volume = 0;
    }
  };

  const loadMobilePresetBuffer = async (sound: SoundName) => {
    const cached = mobilePresetBuffersRef.current[sound];
    if (cached) return cached;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    const response = await fetch(`/sound/mixes/${sound.toLowerCase()}.m4a`);
    if (!response.ok) {
      throw new Error(`Unable to load ${sound} preset mix`);
    }

    const encodedAudio = await response.arrayBuffer();
    const decodedAudio = await audioCtxRef.current.decodeAudioData(encodedAudio);
    mobilePresetBuffersRef.current[sound] = decodedAudio;
    return decodedAudio;
  };

  const loadMobileHtml5Howl = (url: string, loop: boolean) =>
    new Promise<Howl>((resolve, reject) => {
      const howl = new Howl({
        src: [url],
        format: ["wav"],
        loop,
        volume: 1,
        html5: true,
        preload: true,
        onload: () => resolve(howl),
        onloaderror: (_, error) => {
          howl.unload();
          URL.revokeObjectURL(url);
          reject(error);
        },
      });
    });

  const renderMobileSoundscape = async (
    selectedSounds: SoundName[],
    volumes: Record<SoundName, number>,
  ) => {
    if (!isIOS || selectedSounds.length !== 2) return;

    const renderId = ++mobileMixRenderRef.current;
    setIsMobileMixReady(false);

    try {
      const buffers = await Promise.all(
        selectedSounds.map((sound) => loadMobilePresetBuffer(sound)),
      );

      const offlineContext = new OfflineAudioContext(
        2,
        MOBILE_MIX_DURATION_SECONDS * MOBILE_MIX_SAMPLE_RATE,
        MOBILE_MIX_SAMPLE_RATE,
      );

      buffers.forEach((buffer, index) => {
        const source = offlineContext.createBufferSource();
        const gain = offlineContext.createGain();
        const sound = selectedSounds[index];

        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = Math.min(Math.max(volumes[sound], 0), 1);
        source.connect(gain).connect(offlineContext.destination);
        source.start(0);
      });

      const renderedBuffer = await offlineContext.startRendering();
      if (renderId !== mobileMixRenderRef.current) return;

      const blob = new Blob([audioBufferToWav(renderedBuffer)], {
        type: "audio/wav",
      });
      const url = URL.createObjectURL(blob);
      const previousMix = mobileMixHowlRef.current;
      const wasPlaying =
        previousMix?.id !== null &&
        previousMix?.id !== undefined &&
        previousMix.sound.playing(previousMix.id);
      const nextHowl = await loadMobileHtml5Howl(url, true);

      if (renderId !== mobileMixRenderRef.current) {
        nextHowl.unload();
        URL.revokeObjectURL(url);
        return;
      }

      const nextMix = {
        sound: nextHowl,
        id: null as number | null,
        url,
      };
      const previousVolumes = mobileRenderedVolumesRef.current;

      if (wasPlaying && previousMix && previousVolumes) {
        const transitionStart =
          Number(previousMix.sound.seek(previousMix.id!)) %
          MOBILE_MIX_DURATION_SECONDS;
        const transitionContext = new OfflineAudioContext(
          2,
          Math.ceil(
            MOBILE_MIX_TRANSITION_SECONDS * MOBILE_MIX_SAMPLE_RATE,
          ),
          MOBILE_MIX_SAMPLE_RATE,
        );

        buffers.forEach((buffer, index) => {
          const source = transitionContext.createBufferSource();
          const gain = transitionContext.createGain();
          const sound = selectedSounds[index];

          source.buffer = buffer;
          source.loop = true;
          gain.gain.setValueAtTime(previousVolumes[sound], 0);
          gain.gain.linearRampToValueAtTime(
            volumes[sound],
            MOBILE_MIX_TRANSITION_SECONDS,
          );
          source.connect(gain).connect(transitionContext.destination);
          source.start(0, transitionStart);
        });

        const transitionBuffer = await transitionContext.startRendering();
        if (renderId !== mobileMixRenderRef.current) {
          nextHowl.unload();
          URL.revokeObjectURL(url);
          return;
        }

        const transitionUrl = URL.createObjectURL(
          new Blob([audioBufferToWav(transitionBuffer)], {
            type: "audio/wav",
          }),
        );
        const transitionHowl = await loadMobileHtml5Howl(
          transitionUrl,
          false,
        );

        if (renderId !== mobileMixRenderRef.current) {
          transitionHowl.unload();
          URL.revokeObjectURL(transitionUrl);
          nextHowl.unload();
          URL.revokeObjectURL(url);
          return;
        }

        mobilePendingMixHowlRef.current = nextMix;
        const transitionMix = {
          sound: transitionHowl,
          id: null as number | null,
          url: transitionUrl,
        };
        mobileMixHowlRef.current = transitionMix;
        mobileRenderedVolumesRef.current = { ...volumes };

        transitionHowl.once("end", () => {
          if (renderId !== mobileMixRenderRef.current) return;

          const id = nextHowl.play();
          nextMix.id = id;
          nextHowl.seek(
            (transitionStart + MOBILE_MIX_TRANSITION_SECONDS) %
              MOBILE_MIX_DURATION_SECONDS,
            id,
          );
          mobileMixHowlRef.current = nextMix;
          mobilePendingMixHowlRef.current = null;
          transitionHowl.unload();
          URL.revokeObjectURL(transitionUrl);
          setIsMobileMixReady(true);
        });

        const transitionId = transitionHowl.play();
        transitionMix.id = transitionId;
        previousMix.sound.stop();
        previousMix.sound.unload();
        URL.revokeObjectURL(previousMix.url);
        return;
      }

      mobileMixHowlRef.current = nextMix;
      mobileRenderedVolumesRef.current = { ...volumes };

      if (previousMix) {
        previousMix.sound.stop();
        previousMix.sound.unload();
        URL.revokeObjectURL(previousMix.url);
      }

      setIsMobileMixReady(true);
    } catch (error) {
      console.log("[mobile mix render error]", error);
      if (renderId === mobileMixRenderRef.current) {
        setIsMobileMixReady(false);
      }
    }
  };

  const scheduleMobileSoundscapeRender = (
    selectedSounds: SoundName[],
    volumes: Record<SoundName, number>,
  ) => {
    if (!isIOS) return;

    if (mobileMixDebounceRef.current) {
      clearTimeout(mobileMixDebounceRef.current);
    }

    mobileMixDebounceRef.current = setTimeout(() => {
      void renderMobileSoundscape(selectedSounds, volumes);
    }, 120);
  };

  const getSoundscapeBaseVolume = (
    sound: SoundName,
    layerName: "a1" | "b1" | "c1" | "a2" | "a3",
  ) => {
    const folder = sound.toLowerCase();

    const volMap =
      ACTIVE_VOLUME_MAP[folder as keyof typeof ACTIVE_VOLUME_MAP] ??
      ACTIVE_VOLUME_MAP.wave;

    if (!(layerName in volMap)) return 0;

    return volMap[layerName as keyof typeof volMap] ?? 0;
  };

  const applySoundscapeVolume = (sound: SoundName, value: number) => {
    const safeValue = Math.min(Math.max(value, 0), 1);
    const entries = mixHowlsRef.current[sound];

    entries?.forEach((entry) => {
      if (entry.id === null) return;

      const baseVolume = getSoundscapeBaseVolume(sound, entry.name);
      const nextVolume = baseVolume * safeValue;

      if (safeValue <= 0) {
        entry.sound.mute(true, entry.id);
        entry.sound.volume(0, entry.id);
        return;
      }

      entry.sound.mute(false, entry.id);
      entry.sound.volume(nextVolume);
      entry.sound.volume(nextVolume, entry.id);
    });
  };

  const updateMixVolume = (sound: SoundName, value: number) => {
    const safeValue = Math.min(Math.max(value, 0), 1);
    const nextVolumes = {
      ...mixVolumes,
      [sound]: safeValue,
    };

    setMixVolumes(nextVolumes);

    if (isAndroid) {
      applyAndroidMixVolume(sound, safeValue);
      return;
    }

    if (isIOS) {
      return;
    }

    applySoundscapeVolume(sound, safeValue);
  };

  const commitMobileMixVolume = (sound: SoundName, value: number) => {
    if (!isIOS) return;

    const safeValue = Math.min(Math.max(value, 0), 1);
    const nextVolumes = {
      ...mixVolumes,
      [sound]: safeValue,
    };

    setMixVolumes(nextVolumes);
    scheduleMobileSoundscapeRender(selectedMixSounds, nextVolumes);
  };

  const prepareSoundscapeHowls = () => {
    if (isMobile) {
      setSoundscapeLoadedCount(0);
      setSoundscapeTotalCount(0);
      setIsSoundscapeReady(true);
      return;
    }

    const alreadyPrepared = sounds.every(
      ({ name: sound }) => mixHowlsRef.current[sound]?.length,
    );

    if (alreadyPrepared) {
      setSoundscapeLoadedCount(26);
      setSoundscapeTotalCount(26);
      setIsSoundscapeReady(true);
      return;
    }

    setIsSoundscapeReady(false);
    setSoundscapeLoadedCount(0);
    setSoundscapeTotalCount(26);

    let loadedCount = 0;

    sounds.forEach(({ name: sound }) => {
      if (mixHowlsRef.current[sound]?.length) {
        loadedCount += mixHowlsRef.current[sound]?.length ?? 0;
        setSoundscapeLoadedCount(loadedCount);
        return;
      }

      const folder = sound.toLowerCase();

      const layerNames =
        folder === "bonfire" || folder === "cave"
          ? (["a1", "b1", "c1"] as const)
          : (["a1", "b1", "c1", "a2", "a3"] as const);

      const entries = layerNames.map((name) => {
        const howl = new Howl({
          src: [`/sound/${folder}/v1/${name}.wav`],
          loop: true,
          volume: 0,
          html5: true,
          preload: true,

          onload: () => {
            loadedCount++;
            setSoundscapeLoadedCount(loadedCount);

            if (loadedCount >= 26) {
              setIsSoundscapeReady(true);
            }
          },
        });

        return {
          sound: howl,
          id: null as number | null,
          name,
        };
      });

      mixHowlsRef.current[sound] = entries;
    });
  };

  const startSoundscape = async () => {
    stopCurrentSoundscapePlayback();

    if (isAndroid) {
      if (!isMobileMixReady) return;

      [...selectedMixSounds].reverse().forEach((sound, index) => {
        const pair = androidMediaPairsRef.current[sound];
        if (!pair) return;
        const active = pair.elements[pair.activeIndex];

        pair.volume = mixVolumes[sound];
        if (
          index > 0 &&
          Number.isFinite(active.duration) &&
          active.duration > 0
        ) {
          active.currentTime =
            active.duration * ANDROID_SOUNDSCAPE_STAGGER_RATIO;
        }
        active.muted = pair.volume <= 0;
        active.volume = pair.volume;
        active.play().catch((error) => {
          console.log("[android soundscape play error]", sound, error);
        });
      });
      return;
    }

    if (isIOS) {
      const mobileMix = mobileMixHowlRef.current;
      if (!mobileMix || !isMobileMixReady) return;

      const id = mobileMix.sound.play();
      mobileMix.id = id;
      return;
    }

    await unlockHowlerAudio();

    startSilentKeeper();

    for (const sound of selectedMixSounds) {
      const folder = sound.toLowerCase();

      const volMap =
        ACTIVE_VOLUME_MAP[folder as keyof typeof ACTIVE_VOLUME_MAP] ??
        ACTIVE_VOLUME_MAP.wave;

      const layerNames =
        folder === "bonfire" || folder === "cave"
          ? (["a1", "b1", "c1"] as const)
          : (["a1", "b1", "c1", "a2", "a3"] as const);

      const entries = layerNames.map((name) => {
        const howl = new Howl({
          src: [`/sound/${folder}/v1/${name}.wav`],
          loop: true,
          volume: 0,
          html5: true,
          preload: true,
        });

        return {
          sound: howl,
          id: null as number | null,
          name,
        };
      });

      mixHowlsRef.current[sound] = entries;

      entries.forEach((entry) => {
        const id = entry.sound.play();
        entry.id = id;

        const baseVolume =
          entry.name in volMap
            ? volMap[entry.name as keyof typeof volMap]
            : 0;

        const targetVolume = baseVolume * mixVolumes[sound];

        entry.sound.volume(targetVolume, id);
      });
    }
  };

  const stopCurrentSoundscapePlayback = () => {
    Object.values(androidMediaPairsRef.current).forEach((pair) => {
      if (!pair) return;
      pair.elements.forEach((audio, index) => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = index === 0 ? pair.volume : 0;
      });
      pair.activeIndex = 0;
      pair.transitioning = false;
    });

    const mobileMix = mobileMixHowlRef.current;
    if (mobileMix) {
      if (mobileMix.id !== null) {
        mobileMix.sound.stop(mobileMix.id);
      } else {
        mobileMix.sound.stop();
      }
      mobileMix.id = null;
    }

    Object.values(mixHowlsRef.current).forEach((entries) => {
      if (!entries) return;

      entries.forEach((entry) => {
        entry.sound.stop();
        entry.id = null;
      });
    });
  };

  const stopSoundscape = () => {
    stopSilentKeeper();
    clearAndroidSoundscape();

    mobileMixRenderRef.current++;
    if (mobileMixDebounceRef.current) {
      clearTimeout(mobileMixDebounceRef.current);
      mobileMixDebounceRef.current = null;
    }

    const mobileMix = mobileMixHowlRef.current;
    if (mobileMix) {
      mobileMix.sound.stop();
      mobileMix.sound.unload();
      URL.revokeObjectURL(mobileMix.url);
      mobileMixHowlRef.current = null;
    }
    const pendingMobileMix = mobilePendingMixHowlRef.current;
    if (pendingMobileMix) {
      pendingMobileMix.sound.stop();
      pendingMobileMix.sound.unload();
      URL.revokeObjectURL(pendingMobileMix.url);
      mobilePendingMixHowlRef.current = null;
    }
    mobileRenderedVolumesRef.current = null;
    setIsMobileMixReady(false);

    Object.values(mixHowlsRef.current).forEach((entries) => {
      if (!entries) return;

      entries.forEach((entry) => {
        entry.sound.stop();
        entry.sound.unload();
        entry.id = null;
      });
    });

    mixHowlsRef.current = {};
  };

  const clearSoundscapePreload = () => {
    stopSoundscape();

    setIsSoundscapeReady(false);
    setSoundscapeLoadedCount(0);
    setSoundscapeTotalCount(0);
  };

  const [highLevel, setHighLevel] = useState(0.015);
  const [highFreq, setHighFreq] = useState(1800);

  const highLevelRef = useRef(0.015);
  const highFreqRef = useRef(1800);

  const [splashChance, setSplashChance] = useState(0.2);
  const [splashLength, setSplashLength] = useState(25);

  const splashChanceRef = useRef(0.2);
  const splashLengthRef = useRef(25);

  const stopRain = () => {
    stopWaveLayerTest();
  };

  const startRain = async () => {
    stopRain();

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    playWaveLayerTest();
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
    clearSoundscapePreload();

    if (isPlaying) {
      stopRain();
      setIsPlaying(false);
    }

    setSelectedSound(sound);
  };

  /*
  useEffect(() => {
    prepareRainHowls();
    prepareWaveHowls();
    prepareRiverHowls();
    prepareForestHowls();
    prepareBonfireHowls();
    prepareCaveHowls();
  }, []);
  */

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: "hibiki.rest",
      artwork: [
        {
          src: "/apple-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    });

    navigator.mediaSession.playbackState =
      isPlaying || isSoundscapePlaying ? "playing" : "paused";

    navigator.mediaSession.setActionHandler("pause", () => {
      const androidPairs = Object.values(androidMediaPairsRef.current);
      androidPairs.forEach((pair) => {
        if (!pair) return;
        pair.elements.forEach((audio) => audio.pause());
        if (pair.transitioning) {
          const standby = pair.elements[pair.activeIndex === 0 ? 1 : 0];
          standby.currentTime = 0;
          standby.volume = 0;
          pair.elements[pair.activeIndex].volume = pair.volume;
          pair.transitioning = false;
        }
      });
      if (androidPairs.length > 0) {
        setIsSoundscapePlaying(false);
      }

      const mobileMix = mobileMixHowlRef.current;
      if (mobileMix?.id !== null && mobileMix?.id !== undefined) {
        mobileMix.sound.pause(mobileMix.id);
        setIsSoundscapePlaying(false);
      }

      Object.values(mixAudioRefs.current).forEach((audios) => {
        audios?.forEach((audio) => {
          audio.pause();
          audio.currentTime = 0;
        });
      });

      waveAudioRef.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });

      navigator.mediaSession.playbackState = "paused";
      setIsPlaying(false);
    });

    navigator.mediaSession.setActionHandler("play", () => {
      const androidPairs = Object.values(androidMediaPairsRef.current).filter(
        (pair) => pair !== undefined,
      );
      if (isAndroid && androidPairs.length > 0) {
        androidPairs.forEach((pair) => {
          const active = pair.elements[pair.activeIndex];
          active.play().catch((error) => {
            console.log("[android media session play error]", error);
          });
        });
        if (selectedMixSounds.length === 2) {
          setIsSoundscapePlaying(true);
        } else {
          setIsPlaying(true);
        }
        navigator.mediaSession.playbackState = "playing";
        return;
      }

      const mobileMix = mobileMixHowlRef.current;
      if (mobileMix && isMobileMixReady) {
        const id = mobileMix.sound.play();
        mobileMix.id = id;
        setIsSoundscapePlaying(true);
        navigator.mediaSession.playbackState = "playing";
        return;
      }

      setIsPlaying(true);
    });

    navigator.mediaSession.setActionHandler("nexttrack", null);
    navigator.mediaSession.setActionHandler("previoustrack", null);
    navigator.mediaSession.setActionHandler("seekbackward", null);
    navigator.mediaSession.setActionHandler("seekforward", null);
    navigator.mediaSession.setActionHandler("seekto", null);
  }, [
    selectedSound,
    isPlaying,
    isSoundscapePlaying,
    isMobileMixReady,
    isAndroid,
    selectedMixSounds.length,
  ]);

  if (screen === "select") {
    return (
      <div
        style={hibikiShellStyle}
        className={`hibiki-scroll-shell fixed inset-0 bg-[radial-gradient(circle_at_top,_#141518_0%,_#0A0B0D_45%,_#030405_100%)] text-white flex items-center justify-center px-6 overflow-auto ${
          isSafariBrowser ? "hibiki-safari-browser-shell" : ""
        } ${isStandaloneApp ? "hibiki-pwa-shell" : ""}`}
      >
        {/*
        {selectBackground === "wave-video" ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="fixed left-0 right-0 top-0 h-[calc(100dvh+env(safe-area-inset-bottom))] w-screen object-cover object-center"
          >
            <source src="/backgrounds/wave-small.mp4" type="video/mp4" />
          </video>
        ) : (
          <img
            src={`/backgrounds/${selectBackground}.jpg`}
            alt=""
            className="fixed left-0 right-0 top-0 h-[calc(100dvh+env(safe-area-inset-bottom))] w-screen object-cover object-center"
          />
        )}
        */}
        <div className="fixed inset-0 bg-black/70 md:bg-transparent" />
        {/* 
        <div className="absolute w-[500px] h-[500px] bg-white/4 rounded-full blur-3xl top-[-100px] left-[-100px]" />
        <div className="absolute w-[400px] h-[400px] bg-white/4 rounded-full blur-3xl bottom-[-120px] right-[-80px]" />
        */}

        <div className="relative z-10 mt-0 hibiki-card-stage">
          <div className="hibiki-responsive-card rounded-[32px] border border-[#2A2D33] bg-[#111315] backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="flex justify-between px-6 pt-6">
              <button className="text-sm text-white/0 select-none pointer-events-none">
                ← Back
              </button>

              <button
                onClick={() => setScreen("info")}
                className="text-sm text-white/60 transition hover:text-white/80"
              >
                Info →
              </button>
            </div>

            <HibikiLogo />

            <div className="flex min-h-[150px] items-center justify-center px-6 text-center">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Choose Sound
                </h1>

                <p className="mt-2 text-sm leading-6 text-white/60">
                  Select your environment
                </p>
              </div>
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
                              ? "border-[#B8B8B8] bg-[#B8B8B8] scale-[1.01]"
                              : "border-white/10 bg-white/5 group-hover:scale-[1.03] group-hover:bg-white/8"
                          }`}
                        >
                          <Icon
                            className={`w-8 h-8 transition-all ${
                              isSelected
                                ? "text-[#111111] scale-110"
                                : "text-white/60 group-hover:text-white"
                            }`}
                          />
                        </div>
                        <span
                          className={`mt-2 text-xs ${
                            isSelected ? "text-[#E8E8E8]" : "text-white/65"
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
                onClick={() => {
                  if (!selectedSound) return;
                  setScreen("player");
                }}
                className={`mt-6 w-full rounded-2xl border border-white/10 ${
                  selectedSound ? "bg-white/5" : "bg-white/5"
                } backdrop-blur-md py-4 text-base font-medium text-white/60 transition-all duration-200 hover:bg-white/8 hover:scale-[1.03] active:bg-white/8 active:scale-[0.98]`}
              >
                {selectedSound
                  ? `Continue with ${selectedSound}`
                  : "Choose a sound"}
              </button>

              <button
                onClick={() => {
                  prepareSoundscapeHowls();
                  setScreen("soundscape");
                }}
                className="mt-4 flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center transition hover:bg-white/10"
              >
                <div>
                  <p className="text-sm font-medium text-white/60">
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
      </div>
    );
  }

  if (screen === "soundscape") {
    return (
      <div
        style={hibikiShellStyle}
        className={`hibiki-scroll-shell fixed inset-0 bg-[#030405] text-white flex items-center justify-center px-6 overflow-auto ${
          isSafariBrowser ? "hibiki-safari-browser-shell" : ""
        } ${isStandaloneApp ? "hibiki-pwa-shell" : ""}`}
      >
        <div className="relative hibiki-card-stage">
          <div className="hibiki-responsive-card rounded-[32px] border border-[#2A2D33] bg-[#111315] backdrop-blur-md overflow-hidden">
            {/* 👇ここに追加（Backボタン） */}
            <div className="flex justify-between px-6 pt-6">
              <button
                onClick={() => {
                  pauseWaveLayerTestImmediately();

                  setIsPlaying(false);
                  setIsTimerRunning(false);
                  setTimeLeft(0);
                  setSelectedTimer(null);

                  setSelectedMixSounds([]);

                  setMixVolumes({
                    Rain: 0.5,
                    Wave: 0.5,
                    River: 0.5,
                    Bonfire: 0.5,
                    Forest: 0.5,
                    Cave: 0.5,
                  });

                  setScreen("select");
                }}
                className="text-sm text-white/60 transition hover:text-white/80"
              >
                ← Back
              </button>

              <button
                onClick={() => setScreen("info")}
                className="text-sm text-white/60 transition hover:text-white/80"
              >
                Info →
              </button>
            </div>

            {/* 👇タイトル */}
            <HibikiLogo />

            <div className="flex min-h-[150px] items-center justify-center px-6 text-center">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Create Soundscape
                </h1>

                <p className="mt-2 text-sm leading-6 text-white/60">
                  Mix your own ambient world
                </p>

                <p className="mt-2 text-base text-[#D8D8D8]">
                  {selectedMixSounds.join(" + ")}
                </p>
              </div>
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
                              ? "border-[#B8B8B8] bg-[#B8B8B8] scale-[1.01]"
                              : "border-white/10 bg-white/5 group-hover:scale-[1.03] group-hover:bg-white/8"
                          }`}
                        >
                          <Icon
                            className={`w-8 h-8 transition-all ${
                              isSelected
                                ? "text-[#111111] scale-110"
                                : "text-white/60 group-hover:text-white"
                            }`}
                          />
                        </div>
                        <span
                          className={`mt-2 text-xs ${
                            isSelected ? "text-[#E8E8E8]" : "text-white/65"
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
                    disabled={isMobile && !isSoundscapeReady}
                    onClick={() => {
                      if (isMobile && !isSoundscapeReady) return;

                      const nextVolumes = {
                        ...mixVolumes,
                        [selectedMixSounds[0]]: 0.5,
                        [selectedMixSounds[1]]: 0.5,
                      };

                      setMixVolumes(nextVolumes);
                      if (isAndroid) {
                        prepareAndroidSoundscape(
                          selectedMixSounds,
                          nextVolumes,
                        );
                      } else {
                        scheduleMobileSoundscapeRender(
                          selectedMixSounds,
                          nextVolumes,
                        );
                      }

                      setScreen("soundscapeEdit");
                    }}
                    className={`mt-6 w-full rounded-2xl border py-4 text-base font-medium shadow-lg shadow-black/20 transition ${
                      !isMobile || isSoundscapeReady
                        ? "border-[#40444D] bg-[#2A2D33] text-[#D8D8D8] hover:bg-[#343842]"
                        : "timer-breath border-[#2A2D33] bg-[#1A1C20] text-[#7A7A7A]"
                    }`}
                  >
                    {!isMobile || isSoundscapeReady
                      ? "Continue"
                      : `Preparing... ${soundscapeLoadedCount}/${soundscapeTotalCount}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "soundscapeEdit") {
    return (
      <div
        style={hibikiShellStyle}
        className={`hibiki-scroll-shell fixed inset-0 bg-[#030405] text-white flex items-center justify-center px-6 overflow-auto ${
          isSafariBrowser ? "hibiki-safari-browser-shell" : ""
        } ${isStandaloneApp ? "hibiki-pwa-shell" : ""}`}
      >
        <div className="relative hibiki-card-stage">
          <div className="hibiki-responsive-card rounded-[32px] border border-[#2A2D33] bg-[#111315] backdrop-blur-md overflow-hidden">
            <div className="flex justify-between px-6 pt-6">
              <button
                onClick={() => {
                  pauseWaveLayerTestImmediately();

                  stopCurrentSoundscapePlayback();
                  setIsSoundscapePlaying(false);
                  setIsSoundscapeTimerRunning(false);
                  setSoundscapeTimeLeft(0);
                  setSelectedSoundscapeTimer(null);

                  setIsPlaying(false);
                  setIsTimerRunning(false);
                  setTimeLeft(0);
                  setSelectedTimer(null);

                  if (timerRef.current) {
                    clearInterval(timerRef.current);
                  }

                  setMixVolumes((prev) => ({
                    ...prev,
                    [selectedMixSounds[0]]: 0.5,
                    [selectedMixSounds[1]]: 0.5,
                  }));

                  setScreen("soundscape");
                }}
                className="text-sm text-white/60 transition hover:text-white/80"
              >
                ← Back
              </button>

              <button
                onClick={() => setScreen("info")}
                className="text-sm text-white/60 transition hover:text-white/80"
              >
                Info →
              </button>
            </div>

            <HibikiLogo />

            <div className="flex min-h-[150px] items-center justify-center px-6 text-center">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Create Soundscape
                </h1>

                <p className="mt-2 text-base text-[#D8D8D8]">
                  {selectedMixSounds.join(" + ")}
                </p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-lg space-y-5">
                <div className="text-sm text-white/75 text-center">
                  {isMobile && !isMobileMixReady
                    ? "Preparing your mix..."
                    : "Mix your sound"}
                </div>
                {[...selectedMixSounds]
                  .sort(
                    (a, b) =>
                      sounds.findIndex((item) => item.name === a) -
                      sounds.findIndex((item) => item.name === b),
                  )
                  .map((sound) => (
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
                          updateMixVolume(sound, Number(e.target.value));
                        }}
                        onPointerUp={(e) => {
                          commitMobileMixVolume(
                            sound,
                            Number(e.currentTarget.value),
                          );
                        }}
                        onTouchEnd={(e) => {
                          commitMobileMixVolume(
                            sound,
                            Number(e.currentTarget.value),
                          );
                        }}
                        onKeyUp={(e) => {
                          commitMobileMixVolume(
                            sound,
                            Number(e.currentTarget.value),
                          );
                        }}
                        className="hibiki-slider w-full"
                      />
                    </div>
                  ))}
              </div>
              {/* 👇 Sleep Timer（ここに追加） */}
              <div className="mt-6">
                <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-lg space-y-4 min-h-[190px]">
                  <div className="text-sm text-white/75 text-center">
                    Rest with this soundscape
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      disabled={isMobile && !isMobileMixReady}
                      onClick={() => startSoundscapeTimer(30)}
                      className={`rounded-xl border py-4.5 text-sm transition ${selectedSoundscapeTimer === 30 && soundscapeTimeLeft > 0 ? "timer-breath border-[#B8B8B8] bg-[#B8B8B8] text-[#111111]" : "border-white/10 bg-white/5 text-white/75"}`}
                    >
                      {selectedSoundscapeTimer === 30 &&
                      soundscapeTimeLeft > 0 ? (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Square
                            size={8}
                            fill="currentColor"
                            strokeWidth={0}
                          />
                          <span className="text-xs leading-none">
                            {formatTime(soundscapeTimeLeft)}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Play size={10} fill="currentColor" strokeWidth={0} />
                          <span className="text-sm leading-none">30m</span>
                        </span>
                      )}
                    </button>

                    <button
                      disabled={isMobile && !isMobileMixReady}
                      onClick={() => startSoundscapeTimer(60)}
                      className={`rounded-xl border py-4.5 text-sm transition ${selectedSoundscapeTimer === 60 && soundscapeTimeLeft > 0 ? "timer-breath border-[#B8B8B8] bg-[#B8B8B8] text-[#111111]" : "border-white/10 bg-white/5 text-white/75"}`}
                    >
                      {selectedSoundscapeTimer === 60 &&
                      soundscapeTimeLeft > 0 ? (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Square
                            size={8}
                            fill="currentColor"
                            strokeWidth={0}
                          />
                          <span className="text-xs leading-none">
                            {formatTime(soundscapeTimeLeft)}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Play size={10} fill="currentColor" strokeWidth={0} />
                          <span className="text-sm leading-none">60m</span>
                        </span>
                      )}
                    </button>

                    <button
                      disabled={isMobile && !isMobileMixReady}
                      onClick={() => startSoundscapeTimer(120)}
                      className={`rounded-xl border py-4.5 text-sm transition ${selectedSoundscapeTimer === 120 && soundscapeTimeLeft > 0 ? "timer-breath border-[#B8B8B8] bg-[#B8B8B8] text-[#111111]" : "border-white/10 bg-white/5 text-white/75"}`}
                    >
                      {selectedSoundscapeTimer === 120 &&
                      soundscapeTimeLeft > 0 ? (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Square
                            size={8}
                            fill="currentColor"
                            strokeWidth={0}
                          />
                          <span className="text-xs leading-none">
                            {formatTime(soundscapeTimeLeft)}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Play size={10} fill="currentColor" strokeWidth={0} />
                          <span className="text-sm leading-none">2h</span>
                        </span>
                      )}
                    </button>

                    <button
                      disabled={isMobile && !isMobileMixReady}
                      onClick={() => startSoundscapeTimer(180)}
                      className={`rounded-xl border py-4.5 text-sm transition ${selectedSoundscapeTimer === 180 && soundscapeTimeLeft > 0 ? "timer-breath border-[#B8B8B8] bg-[#B8B8B8] text-[#111111]" : "border-white/10 bg-white/5 text-white/75"}`}
                    >
                      {selectedSoundscapeTimer === 180 &&
                      soundscapeTimeLeft > 0 ? (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Square
                            size={8}
                            fill="currentColor"
                            strokeWidth={0}
                          />
                          <span className="text-xs leading-none">
                            {formatTime(soundscapeTimeLeft)}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Play size={10} fill="currentColor" strokeWidth={0} />
                          <span className="text-sm leading-none">3h</span>
                        </span>
                      )}
                    </button>

                    <button
                      disabled={isMobile && !isMobileMixReady}
                      onClick={() => startSoundscapeTimer(360)}
                      className={`rounded-xl border py-4.5 text-sm transition ${selectedSoundscapeTimer === 360 && soundscapeTimeLeft > 0 ? "timer-breath border-[#B8B8B8] bg-[#B8B8B8] text-[#111111]" : "border-white/10 bg-white/5 text-white/75"}`}
                    >
                      {selectedSoundscapeTimer === 360 &&
                      soundscapeTimeLeft > 0 ? (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Square
                            size={8}
                            fill="currentColor"
                            strokeWidth={0}
                          />
                          <span className="text-xs leading-none">
                            {formatTime(soundscapeTimeLeft)}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Play size={10} fill="currentColor" strokeWidth={0} />
                          <span className="text-sm leading-none">6h</span>
                        </span>
                      )}
                    </button>

                    <button
                      disabled={isMobile && !isMobileMixReady}
                      onClick={() => startSoundscapeTimer(480)}
                      className={`rounded-xl border py-4.5 text-sm transition ${selectedSoundscapeTimer === 480 && soundscapeTimeLeft > 0 ? "timer-breath border-[#B8B8B8] bg-[#B8B8B8] text-[#111111]" : "border-white/10 bg-white/5 text-white/75"}`}
                    >
                      {selectedSoundscapeTimer === 480 &&
                      soundscapeTimeLeft > 0 ? (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Square
                            size={8}
                            fill="currentColor"
                            strokeWidth={0}
                          />
                          <span className="text-xs leading-none">
                            {formatTime(soundscapeTimeLeft)}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Play size={10} fill="currentColor" strokeWidth={0} />
                          <span className="text-sm leading-none">8h</span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* 👇ここに追加 */}
            {/*<button
  onClick={() => {
    if (isSoundscapePlaying) 
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
</button>*/}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "info") {
    return (
      <div
        style={hibikiShellStyle}
        className={`hibiki-scroll-shell fixed inset-0 bg-[#030405] text-white flex items-center justify-center px-6 overflow-auto ${
          isSafariBrowser ? "hibiki-safari-browser-shell" : ""
        } ${isStandaloneApp ? "hibiki-pwa-shell" : ""}`}
      >
        <div className="relative z-10 mt-0 hibiki-card-stage">
          <div className="hibiki-responsive-card rounded-[32px] border border-[#2A2D33] bg-[#111315] backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="flex justify-between px-6 pt-6">
              <button
                onClick={() => setScreen("select")}
                className="text-sm text-white/60 transition hover:text-white/80"
              >
                ← Back
              </button>

              <button className="text-sm text-white/0 select-none pointer-events-none">
                Info →
              </button>
            </div>

            <HibikiLogo />

            <div className="flex min-h-[150px] items-center justify-center px-6 text-center">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Information
                </h1>

                <p className="mt-2 text-sm leading-6 text-white/60">
                  Ver0.8.5.8.0
                </p>
              </div>
            </div>

            <div className="px-6 pb-8">
              <div className="space-y-3">
                <button
                  onClick={() => setScreen("privacy")}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-all duration-200 hover:scale-[1.03] hover:border-white/20 hover:bg-white/8 active:scale-[0.98] active:bg-white/8"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-all duration-200 group-hover:border-white/20 group-hover:bg-white/10">
                    <Shield
                      size={24}
                      className="text-white/60 transition-colors duration-200 group-hover:text-white/85"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-medium text-white/80 transition-colors duration-200 group-hover:text-white">
                      Privacy Policy
                    </div>

                    <div className="text-xs text-white/45 transition-colors duration-200 group-hover:text-white/60">
                      How we handle your information
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setScreen("terms")}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-all duration-200 hover:scale-[1.03] hover:border-white/20 hover:bg-white/8 active:scale-[0.98] active:bg-white/8"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-all duration-200 group-hover:border-white/20 group-hover:bg-white/10">
                    <FileText
                      size={24}
                      className="text-white/60 transition-colors duration-200 group-hover:text-white/85"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-medium text-white/80 transition-colors duration-200 group-hover:text-white">
                      Terms of Use
                    </div>

                    <div className="text-xs text-white/45 transition-colors duration-200 group-hover:text-white/60">
                      Rules and conditions for using HIBIKI
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setScreen("devlog")}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-all duration-200 hover:scale-[1.03] hover:border-white/20 hover:bg-white/8 active:scale-[0.98] active:bg-white/8"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-all duration-200 group-hover:border-white/20 group-hover:bg-white/10">
                    <Wrench
                      size={24}
                      className="text-white/60 transition-colors duration-200 group-hover:text-white/85"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-medium text-white/80 transition-colors duration-200 group-hover:text-white">
                      Development Log
                    </div>

                    <div className="text-xs text-white/45 transition-colors duration-200 group-hover:text-white/60">
                      Notes from the development journey
                    </div>
                  </div>
                </button>

                <button className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-all duration-200 hover:scale-[1.03] hover:border-white/20 hover:bg-white/8 active:scale-[0.98] active:bg-white/8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-all duration-200 group-hover:border-white/20 group-hover:bg-white/10">
                    <Heart
                      size={24}
                      className="text-white/60 transition-colors duration-200 group-hover:text-white/85"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-medium text-white/80 transition-colors duration-200 group-hover:text-white">
                      Support HIBIKI
                    </div>

                    <div className="text-xs text-white/45 transition-colors duration-200 group-hover:text-white/60">
                      Help support this quiet place
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "privacy") {
    return (
      <div
        style={hibikiShellStyle}
        className={`hibiki-scroll-shell fixed inset-0 bg-[#030405] text-white flex items-center justify-center px-6 overflow-auto ${
          isSafariBrowser ? "hibiki-safari-browser-shell" : ""
        } ${isStandaloneApp ? "hibiki-pwa-shell" : ""}`}
      >
        <div className="relative z-10 mt-0 hibiki-card-stage">
          <div className="hibiki-responsive-card flex flex-col rounded-[32px] border border-[#2A2D33] bg-[#111315] backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="flex justify-between px-6 pt-6">
              <button
                onClick={() => setScreen("info")}
                className="text-sm text-white/60 transition hover:text-white/80"
              >
                ← Back
              </button>

              <button className="text-sm text-white/0 select-none pointer-events-none">
                Info →
              </button>
            </div>

            <HibikiLogo />

            <div className="px-6 text-center">
              <h1 className="text-3xl font-semibold tracking-tight">
                Privacy Policy
              </h1>

              <p className="mt-2 text-sm leading-6 text-white/60">
                How HIBIKI handles information
              </p>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto px-6 pb-8 text-left">
              <div className="space-y-6 text-sm leading-7 text-white/75">
                <div>
                  <h2 className="mb-2 text-base text-white">
                    Information We Collect
                  </h2>
                  <p>
                    HIBIKI does not require user accounts and does not collect
                    personal information such as your name, email address, or
                    phone number during normal use.
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 text-base text-white">Analytics</h2>
                  <p>
                    HIBIKI may use privacy-friendly analytics and hosting
                    services to understand traffic and usage patterns.
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 text-base text-white">Cookies</h2>
                  <p>
                    HIBIKI may use essential cookies required for the operation
                    of the website. We do not use cookies for advertising
                    purposes.
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 text-base text-white">
                    Third-Party Services
                  </h2>
                  <p>
                    HIBIKI relies on third-party services for hosting and
                    analytics. These services operate under their own privacy
                    policies.
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 text-base text-white">Changes</h2>
                  <p>
                    This Privacy Policy may be updated from time to time. Any
                    changes will be published on this page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "terms") {
    return (
      <div
        style={hibikiShellStyle}
        className={`hibiki-scroll-shell fixed inset-0 bg-[#030405] text-white flex items-center justify-center px-6 overflow-auto ${
          isSafariBrowser ? "hibiki-safari-browser-shell" : ""
        } ${isStandaloneApp ? "hibiki-pwa-shell" : ""}`}
      >
        <div className="relative z-10 mt-0 hibiki-card-stage">
          <div className="hibiki-responsive-card flex flex-col rounded-[32px] border border-[#2A2D33] bg-[#111315] backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="flex justify-between px-6 pt-6">
              <button
                onClick={() => setScreen("info")}
                className="text-sm text-white/60 transition hover:text-white/80"
              >
                ← Back
              </button>

              <button className="text-sm text-white/0 select-none pointer-events-none">
                Terms
              </button>
            </div>

            <HibikiLogo />

            <div className="px-6 text-center">
              <h1 className="text-3xl font-semibold tracking-tight">
                Terms of Use
              </h1>

              <p className="mt-2 text-sm leading-6 text-white/60">
                Last updated: June 2026
              </p>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto px-6 pb-8 text-left">
              <div className="space-y-6 text-sm leading-7 text-white/75">
                <p>Welcome to HIBIKI.</p>

                <p>
                  By accessing or using HIBIKI, you agree to these Terms of Use.
                  If you do not agree with these terms, please do not use the
                  service.
                </p>

                <div>
                  <h2 className="mb-2 text-base text-white">1. About HIBIKI</h2>
                  <p>
                    HIBIKI is an ambient sound experience designed to provide a
                    space for rest, relaxation, and focus.
                  </p>
                  <p className="mt-3">
                    HIBIKI is provided for personal and non-commercial use only.
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 text-base text-white">
                    2. No Medical Advice
                  </h2>
                  <p>
                    HIBIKI is not a medical device and does not provide medical,
                    psychological, or therapeutic advice.
                  </p>
                  <p className="mt-3">
                    The sounds and content available through HIBIKI are intended
                    for general wellness and personal enjoyment only.
                  </p>
                  <p className="mt-3">
                    If you have concerns regarding your physical or mental
                    health, please consult a qualified healthcare professional.
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 text-base text-white">
                    3. Intellectual Property
                  </h2>
                  <p>
                    All audio recordings, soundscapes, designs, logos, text, and
                    other content provided through HIBIKI are protected by
                    applicable intellectual property laws.
                  </p>
                  <p className="mt-3">
                    You may not copy, reproduce, distribute, modify, sell, or
                    create derivative works from any content without prior
                    written permission.
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 text-base text-white">
                    4. Acceptable Use
                  </h2>
                  <p>You agree not to:</p>
                  <ul className="mt-3 list-disc pl-5">
                    <li>Use HIBIKI for any unlawful purpose.</li>
                    <li>Attempt to interfere with or disrupt the service.</li>
                    <li>
                      Reverse engineer, decompile, or attempt to access the
                      source code of the service.
                    </li>
                    <li>
                      Use automated systems to access the service in a manner
                      that may damage or overload it.
                    </li>
                  </ul>
                </div>

                <div>
                  <h2 className="mb-2 text-base text-white">5. Availability</h2>
                  <p>
                    HIBIKI is provided on an &quot;as is&quot; and &quot;as
                    available&quot; basis.
                  </p>
                  <p className="mt-3">
                    We do not guarantee that the service will always be
                    available, uninterrupted, secure, or error-free.
                  </p>
                  <p className="mt-3">
                    Features, content, and availability may change at any time
                    without notice.
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 text-base text-white">
                    6. Limitation of Liability
                  </h2>
                  <p>
                    To the fullest extent permitted by law, HIBIKI and its
                    creator shall not be liable for any indirect, incidental,
                    special, consequential, or punitive damages arising from
                    your use of the service.
                  </p>
                  <p className="mt-3">
                    Your use of HIBIKI is at your own risk.
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 text-base text-white">
                    7. Third-Party Services
                  </h2>
                  <p>
                    HIBIKI may use or link to third-party services, platforms,
                    or payment providers.
                  </p>
                  <p className="mt-3">
                    We are not responsible for the content, policies, or
                    practices of those third-party services.
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 text-base text-white">8. Termination</h2>
                  <p>
                    We reserve the right to suspend or terminate access to
                    HIBIKI at any time if these Terms are violated or if the
                    service is discontinued.
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 text-base text-white">
                    9. Changes to These Terms
                  </h2>
                  <p>These Terms of Use may be updated from time to time.</p>
                  <p className="mt-3">
                    Continued use of HIBIKI after changes become effective
                    constitutes acceptance of the updated Terms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "devlog") {
    return (
      <div
        style={hibikiShellStyle}
        className={`hibiki-scroll-shell fixed inset-0 bg-[#030405] text-white flex items-center justify-center px-6 overflow-auto ${
          isSafariBrowser ? "hibiki-safari-browser-shell" : ""
        } ${isStandaloneApp ? "hibiki-pwa-shell" : ""}`}
      >
        <div className="relative z-10 mt-0 hibiki-card-stage">
          <div className="hibiki-responsive-card flex flex-col rounded-[32px] border border-[#2A2D33] bg-[#111315] backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="flex justify-between px-6 pt-6">
              <button
                onClick={() => setScreen("info")}
                className="text-sm text-white/60 transition hover:text-white/80"
              >
                ← Back
              </button>

              <button className="text-sm text-white/0 select-none pointer-events-none">
                Devlog
              </button>
            </div>

            <HibikiLogo />

            <div className="px-6 text-center">
              <h1 className="text-3xl font-semibold tracking-tight">
                Development Log
              </h1>

              <p className="mt-2 text-sm leading-6 text-white/60">
                Notes from the development journey
              </p>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto px-6 pb-8 text-left">
              <div className="space-y-6 text-sm leading-7 text-white/75">
                <div>
                  <h2 className="mb-1 text-base text-white">
                    Resolved — iPhone Volume Sliders
                  </h2>

                  <p className="text-xs text-white/50">June 16, 2026</p>

                  <p className="mt-2 text-xs text-emerald-300">
                    Status: Fixed in Ver0.8.5.7.9
                  </p>

                  <p className="mt-4">
                    We have confirmed that volume sliders in Create Soundscape
                    do not affect individual sound levels on some iPhone
                    devices.
                  </p>

                  <p className="mt-3">
                    The issue was caused by iOS audio behavior, which prevented
                    standard HTML audio volume controls from applying gradual
                    volume changes.
                  </p>

                  <p className="mt-3">
                    A new mobile mixing method now restores individual volume
                    control while preserving background playback support on
                    iOS.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "player") {
    return (
      <div
        style={hibikiShellStyle}
        className={`hibiki-scroll-shell fixed inset-0 bg-[radial-gradient(circle_at_top,_#141518_0%,_#0A0B0D_45%,_#030405_100%)] text-white flex items-center justify-center px-6 overflow-auto ${
          isSafariBrowser ? "hibiki-safari-browser-shell" : ""
        } ${isStandaloneApp ? "hibiki-pwa-shell" : ""}`}
      >
        {selectedSound && (
          <>
            <div className="absolute inset-0 bg-[#05070A]/88 md:bg-[#05070A]/60" />
          </>
        )}

        <div className="relative z-10 mt-0 hibiki-card-stage">
          <div className="hibiki-responsive-card rounded-[32px] border border-[#2A2D33] bg-[#111315] backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="flex justify-between px-6 pt-6">
              <button
                onClick={() => {
                  pauseWaveLayerTestImmediately();

                  setIsPlaying(false);
                  setIsTimerRunning(false);
                  setTimeLeft(0);
                  setSelectedTimer(null);
                  setSelectedSound(null);

                  setScreen("select");
                }}
                className="text-sm text-white/60 transition hover:text-white/80"
              >
                ← Back
              </button>

              <button
                onClick={() => setScreen("info")}
                className="text-sm text-white/60 transition hover:text-white/80"
              >
                Info →
              </button>
            </div>

            <HibikiLogo />

            <div className="px-6 pt-0 text-center">
              <div className="flex min-h-[150px] items-center justify-center">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {selectedSound}
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Gentle ambient sound for rest.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-lg min-h-[190px]">
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
                    Rest with this sound
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        startSleepTimer(30);
                      }}
                      className={`rounded-xl border py-4.5 text-sm transition ${
                        selectedTimer === 30 && timeLeft > 0
                          ? "timer-breath border-[#B8B8B8] bg-[#B8B8B8] text-[#111111]"
                          : "border-white/10 bg-white/5 text-white/75"
                      }`}
                    >
                      {selectedTimer === 30 && timeLeft > 0 ? (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Square
                            size={8}
                            fill="currentColor"
                            strokeWidth={0}
                          />
                          <span className="text-xs leading-none">
                            {formatTime(timeLeft)}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Play size={10} fill="currentColor" strokeWidth={0} />
                          <span className="text-sm leading-none">30m</span>
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => startSleepTimer(60)}
                      className={`rounded-xl border py-4.5 text-sm transition ${
                        selectedTimer === 60 && timeLeft > 0
                          ? "timer-breath border-[#B8B8B8] bg-[#B8B8B8] text-[#111111]"
                          : "border-white/10 bg-white/5 text-white/75"
                      }`}
                    >
                      {selectedTimer === 60 && timeLeft > 0 ? (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Square
                            size={8}
                            fill="currentColor"
                            strokeWidth={0}
                          />
                          <span className="text-xs leading-none">
                            {formatTime(timeLeft)}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Play size={10} fill="currentColor" strokeWidth={0} />
                          <span className="text-sm leading-none">60m</span>
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => startSleepTimer(120)}
                      className={`rounded-xl border py-4.5 text-sm transition ${
                        selectedTimer === 120 && timeLeft > 0
                          ? "timer-breath border-[#B8B8B8] bg-[#B8B8B8] text-[#111111]"
                          : "border-white/10 bg-white/5 text-white/75"
                      }`}
                    >
                      {selectedTimer === 120 && timeLeft > 0 ? (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Square
                            size={8}
                            fill="currentColor"
                            strokeWidth={0}
                          />
                          <span className="text-xs leading-none">
                            {formatTime(timeLeft)}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Play size={10} fill="currentColor" strokeWidth={0} />
                          <span className="text-sm leading-none">2h</span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => startSleepTimer(180)}
                    className={`rounded-xl border py-4.5 text-sm transition ${
                      selectedTimer === 180 && timeLeft > 0
                        ? "timer-breath border-[#B8B8B8] bg-[#B8B8B8] text-[#111111]"
                        : "border-white/10 bg-white/5 text-white/75"
                    }`}
                  >
                    {selectedTimer === 180 && timeLeft > 0 ? (
                      <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <Square size={8} fill="currentColor" strokeWidth={0} />
                        <span className="text-xs leading-none">
                          {formatTime(timeLeft)}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <Play size={10} fill="currentColor" strokeWidth={0} />
                        <span className="text-sm leading-none">3h</span>
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => startSleepTimer(360)}
                    className={`rounded-xl border py-4.5 text-sm transition ${
                      selectedTimer === 360 && timeLeft > 0
                        ? "timer-breath border-[#B8B8B8] bg-[#B8B8B8] text-[#111111]"
                        : "border-white/10 bg-white/5 text-white/75"
                    }`}
                  >
                    {selectedTimer === 360 && timeLeft > 0 ? (
                      <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <Square size={8} fill="currentColor" strokeWidth={0} />
                        <span className="text-xs leading-none">
                          {formatTime(timeLeft)}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <Play size={10} fill="currentColor" strokeWidth={0} />
                        <span className="text-sm leading-none">6h</span>
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => startSleepTimer(480)}
                    className={`rounded-xl border py-4.5 text-sm transition ${
                      selectedTimer === 480 && timeLeft > 0
                        ? "timer-breath border-[#B8B8B8] bg-[#B8B8B8] text-[#111111]"
                        : "border-white/10 bg-white/5 text-white/75"
                    }`}
                  >
                    {selectedTimer === 480 && timeLeft > 0 ? (
                      <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <Square size={8} fill="currentColor" strokeWidth={0} />
                        <span className="text-xs leading-none">
                          {formatTime(timeLeft)}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <Play size={10} fill="currentColor" strokeWidth={0} />
                        <span className="text-sm leading-none">8h</span>
                      </span>
                    )}
                  </button>
                </div>

                {false && (
                  <div className="mt-6 space-y-4 border border-red-500 p-4">
                    <div>
                      <div className="mb-2 flex justify-between text-sm text-white/75">
                        <span>High Layer Level</span>
                        <span className="text-white/40">
                          {highLevel.toFixed(3)}
                        </span>
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
                        <span className="text-white/40">
                          {splashChance.toFixed(2)}
                        </span>
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

                {process.env.NODE_ENV === "development" && (
                  <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <div className="mb-2 text-xs text-yellow-200">
                      Debug Time: {debugTimeSec}s /{" "}
                      {Math.floor(debugTimeSec / 3600)}:
                      {String(Math.floor((debugTimeSec % 3600) / 60)).padStart(
                        2,
                        "0",
                      )}
                      :{String(debugTimeSec % 60).padStart(2, "0")}
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={28800}
                      step={1}
                      value={debugTimeSec}
                      onChange={(e) => {
                        const sec = Number(e.target.value);
                        setDebugTimeSec(sec);
                        jumpWaveToTime(sec);
                      }}
                      className="w-full"
                    />

                    <div className="mt-3 flex gap-2">
                      <input
                        type="number"
                        min={0}
                        max={28800}
                        value={debugInputSec}
                        onChange={(e) => setDebugInputSec(e.target.value)}
                        placeholder="Enter seconds"
                        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const sec = Number(debugInputSec);
                          if (Number.isNaN(sec)) return;

                          setDebugTimeSec(sec);
                          jumpWaveToTime(sec);
                        }}
                        className="rounded-lg border border-yellow-300/30 bg-yellow-400/20 px-3 py-2 text-sm text-yellow-100"
                      >
                        Jump
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
