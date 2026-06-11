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
  Pause,
  Square,
  Shield,
  FileText,
  Heart,
} from "lucide-react";

import { Howl, Howler } from "howler";

Howler.autoSuspend = false;

type SoundName = "Rain" | "Wave" | "River" | "Bonfire" | "Forest" | "Cave";

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

  type FadeJob = {
    cancelled: boolean;
    frameId: number | null;
  };

  const fadeJobsRef = useRef<Map<string, FadeJob>>(new Map());

  const getFadeKey = (category: string, layer: string) =>
    `${category}:${layer}`;

  const cancelFade = (key: string) => {
    const job = fadeJobsRef.current.get(key);
    if (!job) return;

    job.cancelled = true;

    if (job.frameId !== null) {
      cancelAnimationFrame(job.frameId);
    }

    fadeJobsRef.current.delete(key);
  };

  const fadeHowlVolume = ({
    key,
    sound,
    id,
    from,
    to,
    duration,
    curve = 1,
    onComplete,
  }: {
    key: string;
    sound: Howl;
    id: number;
    from: number;
    to: number;
    duration: number;
    curve?: number;
    onComplete?: () => void;
  }) => {
    cancelFade(key);

    if (duration <= 0) {
      sound.volume(to, id);
      onComplete?.();
      return;
    }

    const job: FadeJob = {
      cancelled: false,
      frameId: null,
    };

    fadeJobsRef.current.set(key, job);

    const start = performance.now();

    const tick = (now: number) => {
      if (job.cancelled) return;

      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const shaped = Math.pow(progress, curve);

      const nextVolume = from + (to - from) * shaped;

      sound.volume(nextVolume, id);

      if (to === 0 && key.startsWith("rain:")) {
        console.log("[rain fadeOut]", {
          key,
          progress,
          nextVolume,
        });
      }

      if (progress < 1) {
        job.frameId = requestAnimationFrame(tick);
        return;
      }

      sound.volume(to, id);
      fadeJobsRef.current.delete(key);
      onComplete?.();
    };

    job.frameId = requestAnimationFrame(tick);
  };

  const stopHowlEntries = (
    entries: { sound: Howl; id: number | null; name: string }[],
    category: string,
  ) => {
    entries.forEach(({ sound, id, name }) => {
      if (id === null) {
        sound.stop();
        return;
      }

      const currentVolume = Number(sound.volume(id));
      const safeVolume = Number.isFinite(currentVolume) ? currentVolume : 0;

      const fadeConfig = getActiveFadeConfig(category);

      fadeHowlVolume({
        key: getFadeKey(category, name),
        sound,
        id,
        from: safeVolume,
        to: 0,
        duration: fadeConfig.fadeOutMs,
        curve: fadeConfig.fadeOutCurve,
        onComplete: () => {
          sound.stop(id);
        },
      });
    });
  };

  const silentKeeperRef = useRef<Howl | null>(null);

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

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const ACTIVE_VOLUME_MAP = isMobile ? VOLUME_MAP_MOBILE : VOLUME_MAP_DESKTOP;

  // =====================================================
  // Fade Tuning
  // Desktop / Mobile fade behavior
  //
  // fadeInMs   : 音が立ち上がる時間
  // fadeOutMs  : 音が消える時間(現在未使用・将来用)
  // curve
  //   1.0  = linear
  //   <1.0 = 早めに立ち上がる
  //   >1.0 = ゆっくり立ち上がる
  //
  // 実機テストで調整する主要パラメータ
  // =====================================================

  type FadeConfig = {
    fadeInMs: number;
    fadeOutMs: number;
    fadeInCurve: number;
    fadeOutCurve: number;
  };

  const FADE_CONFIG_DESKTOP = {
    fadeInMs: 450,
    fadeOutMs: 1800,
    fadeInCurve: 0.75,
    fadeOutCurve: 0.75,
  };

  const FADE_CONFIG_MOBILE = {
    fadeInMs: 0,
    fadeOutMs: 0,
    fadeInCurve: 1,
    fadeOutCurve: 1,
  };

  // =====================================================
  // Mobile Per-Preset Fade Tuning
  //
  // Wave / Rain / River / Forest / Bonfire / Cave
  // 個別フェード調整用
  // ACTIVE_FADE_CONFIG から切り替え有効化済み
  // =====================================================

  const FADE_CONFIG_MOBILE_BY_SOUND = {
    wave: {
      fadeInMs: 0,
      fadeOutMs: 0,
      fadeInCurve: 1,
      fadeOutCurve: 1,
    },

    rain: {
      fadeInMs: 0,
      fadeOutMs: 0,
      fadeInCurve: 1,
      fadeOutCurve: 1,
    },

    river: {
      fadeInMs: 0,
      fadeOutMs: 0,
      fadeInCurve: 1,
      fadeOutCurve: 1,
    },

    forest: {
      fadeInMs: 0,
      fadeOutMs: 0,
      fadeInCurve: 1,
      fadeOutCurve: 1,
    },

    bonfire: {
      fadeInMs: 0,
      fadeOutMs: 0,
      fadeInCurve: 1,
      fadeOutCurve: 1,
    },

    cave: {
      fadeInMs: 0,
      fadeOutMs: 0,
      fadeInCurve: 1,
      fadeOutCurve: 1,
    },
  };

  const getActiveFadeConfig = (folder: string): FadeConfig => {
    if (!isMobile) return FADE_CONFIG_DESKTOP;

    return (
      FADE_CONFIG_MOBILE_BY_SOUND[
        folder as keyof typeof FADE_CONFIG_MOBILE_BY_SOUND
      ] ?? FADE_CONFIG_MOBILE
    );
  };

  const ACTIVE_FADE_CONFIG = isMobile
    ? FADE_CONFIG_MOBILE
    : FADE_CONFIG_DESKTOP;

  // =====================================================
  // Fade Out Stop Timing
  //
  // fadeOutDuration : 実際のフェードアウト時間
  // pauseDelay      : 将来pauseを使う場合の待機時間
  // resetDelay      : 将来seek(0)等を行う場合の待機時間
  //
  // フェードアウトがぶつ切りに聞こえる場合は
  // fadeOutDuration を調整
  // =====================================================

  const AUDIO_STOP_CONFIG_DESKTOP = {
    fadeOutDuration: 2600,
    pauseDelay: 300,
    resetDelay: 100,
  };

  const AUDIO_STOP_CONFIG_MOBILE = {
    fadeOutDuration: 2600,
    pauseDelay: 900,
    resetDelay: 300,
  };

  const ACTIVE_AUDIO_STOP_CONFIG = isMobile
    ? AUDIO_STOP_CONFIG_MOBILE
    : AUDIO_STOP_CONFIG_DESKTOP;

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
    if (!silentKeeperRef.current) return;

    silentKeeperRef.current.stop();
    silentKeeperRef.current.unload();
    silentKeeperRef.current = null;
  };

  const playWaveLayerTest = async () => {
    console.log("RUNNING playWaveLayerTest");

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
        const id = entry.sound.play();
        entry.id = id;

        entry.sound.volume(0, id);

        const targetVolume = forestVolMap[entry.name] ?? 0;

        const fadeConfig = getActiveFadeConfig("forest");

        const key = getFadeKey("forest", entry.name);

        fadeHowlVolume({
          key,
          sound: entry.sound,
          id,
          from: 0,
          to: targetVolume,
          duration: fadeConfig.fadeInMs,
          curve: fadeConfig.fadeInCurve,
        });
      });

      return;
    }

    if (folder === "wave") {
      if (waveHowlsRef.current.length === 0) {
        prepareWaveHowls();
      }

      const waveVolMap = ACTIVE_VOLUME_MAP.wave;

      waveHowlsRef.current.forEach((entry) => {
        const id = entry.sound.play();
        entry.id = id;

        entry.sound.volume(0, id);

        const targetVolume = waveVolMap[entry.name] ?? 0;

        const fadeConfig = getActiveFadeConfig("wave");

        const key = getFadeKey("wave", entry.name);

        fadeHowlVolume({
          key,
          sound: entry.sound,
          id,
          from: 0,
          to: targetVolume,
          duration: fadeConfig.fadeInMs,
          curve: fadeConfig.fadeInCurve,
        });
      });

      return;
    }

    if (folder === "river") {
      if (riverHowlsRef.current.length === 0) {
        prepareRiverHowls();
      }

      const riverVolMap = ACTIVE_VOLUME_MAP.river;

      riverHowlsRef.current.forEach((entry) => {
        const id = entry.sound.play();
        entry.id = id;

        entry.sound.volume(0, id);

        const targetVolume = riverVolMap[entry.name] ?? 0;

        const fadeConfig = getActiveFadeConfig("river");

        const key = getFadeKey("river", entry.name);

        fadeHowlVolume({
          key,
          sound: entry.sound,
          id,
          from: 0,
          to: targetVolume,
          duration: fadeConfig.fadeInMs,
          curve: fadeConfig.fadeInCurve,
        });
      });

      return;
    }

    if (folder === "rain") {
      if (rainHowlsRef.current.length === 0) {
        prepareRainHowls();
      }

      const rainVolMap = ACTIVE_VOLUME_MAP.rain;

      rainHowlsRef.current.forEach((entry) => {
        const id = entry.sound.play();
        entry.id = id;

        entry.sound.volume(0, id);

        const targetVolume = rainVolMap[entry.name] ?? 0;

        const fadeConfig = getActiveFadeConfig("rain");

        const key = getFadeKey("rain", entry.name);

        fadeHowlVolume({
          key,
          sound: entry.sound,
          id,
          from: 0,
          to: targetVolume,
          duration: fadeConfig.fadeInMs,
          curve: fadeConfig.fadeInCurve,
        });
      });

      return;
    }

    if (folder === "bonfire") {
      if (bonfireHowlsRef.current.length === 0) {
        prepareBonfireHowls();
      }

      const bonfireVolMap = ACTIVE_VOLUME_MAP.bonfire;

      bonfireHowlsRef.current.forEach((entry) => {
        const id = entry.sound.play();
        entry.id = id;

        entry.sound.volume(0, id);

        const targetVolume = bonfireVolMap[entry.name] ?? 0;

        const fadeConfig = getActiveFadeConfig("bonfire");

        const key = getFadeKey("bonfire", entry.name);

        fadeHowlVolume({
          key,
          sound: entry.sound,
          id,
          from: 0,
          to: targetVolume,
          duration: fadeConfig.fadeInMs,
          curve: fadeConfig.fadeInCurve,
        });
      });

      return;
    }

    if (folder === "cave") {
      if (caveHowlsRef.current.length === 0) {
        prepareCaveHowls();
      }

      const caveVolMap = ACTIVE_VOLUME_MAP.cave;

      caveHowlsRef.current.forEach((entry) => {
        const id = entry.sound.play();
        entry.id = id;

        entry.sound.volume(0, id);

        const targetVolume = caveVolMap[entry.name] ?? 0;

        const fadeConfig = getActiveFadeConfig("cave");

        const key = getFadeKey("cave", entry.name);

        fadeHowlVolume({
          key,
          sound: entry.sound,
          id,
          from: 0,
          to: targetVolume,
          duration: fadeConfig.fadeInMs,
          curve: fadeConfig.fadeInCurve,
        });
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
        stopForestHowls();
        stopSoundscape();
        setIsSoundscapePlaying(false);
      }

      return;
    }
    setSelectedSoundscapeTimer(minutes);
    setSoundscapeTimeLeft(minutes * 60);
    setIsSoundscapeTimerRunning(true);

    stopSoundscape();
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

  useEffect(() => {
    if (screen !== "soundscape") return;

    sounds.forEach((sound) => {
      prepareMixHowls(sound.name);
    });
  }, [screen]);

  const [playerVolume, setPlayerVolume] = useState(0.3);
  const [selectedMixSounds, setSelectedMixSounds] = useState<SoundName[]>([]);
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

    mixHowlsRef.current[sound]?.forEach((entry) => {
      if (entry.id === null) return;

      const baseVolume = getSoundscapeBaseVolume(sound, entry.name);
      const nextVolume = baseVolume * safeValue;

      entry.sound.mute(false, entry.id);
      entry.sound.volume(nextVolume, entry.id);
    });
  };

  const updateMixVolume = (sound: SoundName, value: number) => {
    console.log("UPDATE", sound, value);

    const safeValue = Math.min(Math.max(value, 0), 1);

    setMixVolumes((prev) => ({
      ...prev,
      [sound]: safeValue,
    }));

    applySoundscapeVolume(sound, safeValue);
  };

  const prepareMixHowls = (sound: SoundName) => {
    if (mixHowlsRef.current[sound]) return;

    const folder = sound.toLowerCase();

    const layerNames =
      folder === "bonfire" || folder === "cave"
        ? (["a1", "b1", "c1"] as const)
        : (["a1", "b1", "c1", "a2", "a3"] as const);

    const entries = layerNames.map((name) => ({
      sound: new Howl({
        src: [`/sound/${folder}/v1/${name}.wav`],
        loop: true,
        volume: 0,
        html5: true,
        preload: true,
      }),
      id: null as number | null,
      name,
    }));

    mixHowlsRef.current[sound] = entries;
  };

  const startSoundscape = async () => {
    stopSoundscape();

    await unlockHowlerAudio();

    startSilentKeeper();

    for (const sound of selectedMixSounds) {
      const folder = sound.toLowerCase();

      const volMap =
        ACTIVE_VOLUME_MAP[folder as keyof typeof ACTIVE_VOLUME_MAP] ??
        ACTIVE_VOLUME_MAP.wave;

      prepareMixHowls(sound);

      const entries = mixHowlsRef.current[sound] ?? [];

      entries.forEach((entry) => {
        const id = entry.sound.play();
        entry.id = id;

        const baseVolume =
          entry.name in volMap ? volMap[entry.name as keyof typeof volMap] : 0;

        const targetVolume = baseVolume * mixVolumes[sound];

        const fadeConfig = getActiveFadeConfig(folder);

        entry.sound.volume(0, id);

        const key = getFadeKey(folder, entry.name);

        fadeHowlVolume({
          key,
          sound: entry.sound,
          id,
          from: 0,
          to: targetVolume,
          duration: fadeConfig.fadeInMs,
          curve: fadeConfig.fadeInCurve,
        });
      });
    }
  };

  const stopSoundscape = () => {
    stopSilentKeeper();

    Object.entries(mixHowlsRef.current).forEach(([soundName, entries]) => {
      if (!entries) return;

      stopHowlEntries(entries, soundName.toLowerCase());
    });
  };

  const pauseSoundscape = () => {
    Object.values(mixHowlsRef.current).forEach((entries) => {
      entries?.forEach((entry) => {
        if (entry.id !== null) {
          entry.sound.pause(entry.id);
        }
      });
    });
  };

  const muteSoundscape = () => {
    Object.entries(mixHowlsRef.current).forEach(([soundName, entries]) => {
      if (!entries) return;

      entries.forEach((entry) => {
        if (entry.id === null) return;

        entry.sound.volume(0, entry.id);
      });
    });
  };

  const unmuteSoundscape = () => {
    selectedMixSounds.forEach((sound) => {
      applySoundscapeVolume(sound, mixVolumes[sound]);
    });
  };

  const resumeSoundscape = async () => {
    await unlockHowlerAudio();
    startSilentKeeper();

    Object.values(mixHowlsRef.current).forEach((entries) => {
      entries?.forEach((entry) => {
        if (entry.id !== null) {
          entry.sound.play(entry.id);
        }
      });
    });
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
          title: "Wave",
          subtitle: "Gentle waves for relaxation.",
          frequency: 1200,
          gain: 0.3,
          controlLabel: "Wave",
        };
      case "River":
        return {
          title: "River",
          subtitle: "Flowing river ambience for relaxation.",
          frequency: 3200,
          gain: 0.2,
          controlLabel: "River",
        };
      case "Bonfire":
        return {
          title: "Bonfire",
          subtitle: "Warm bonfire ambience for relaxation.",
          frequency: 850,
          gain: 0.26,
          controlLabel: "Fire",
        };
      case "Forest":
        return {
          title: "Forest",
          subtitle: "Natural forest ambience for relaxation.",
          frequency: 1900,
          gain: 0.18,
          controlLabel: "Forest",
        };
      case "Cave":
        return {
          title: "Cave",
          subtitle: "Deep cave ambience for relaxation.",
          frequency: 2000,
          gain: 0.2,
          controlLabel: "Cave",
        };
      default:
        return {
          title: "Rain",
          subtitle: "Endless rain sound for relaxation.",
          frequency: 2500,
          gain: 0.25,
          controlLabel: "Rain",
        };
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
    stopWaveLayerTest();
  };

  const startRain = async () => {
    stopRain();

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    const ctx = audioCtxRef.current;
    const sound = getSoundConfig();

    playWaveLayerTest();
    return;

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

    if (selectedSound === "Cave") {
      filter.frequency.value = 2000;
    } else {
      filter.frequency.value = sound.frequency;
    }

    const gain = ctx.createGain();

    // 👇 最終目標値を先に決める
    const targetGain = sound.gain;

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
        filter.frequency.value = base;

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

    if (sound === "Forest") {
      prepareForestHowls();
    }

    if (sound === "Wave") {
      prepareWaveHowls();
    }

    if (sound === "River") {
      prepareRiverHowls();
    }

    if (sound === "Rain") {
      prepareRainHowls();
    }

    if (sound === "Bonfire") {
      prepareBonfireHowls();
    }

    if (sound === "Cave") {
      prepareCaveHowls();
    }
  };

  useEffect(() => {
    prepareRainHowls();
    prepareWaveHowls();
    prepareRiverHowls();
    prepareForestHowls();
    prepareBonfireHowls();
    prepareCaveHowls();
  }, []);

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

    //navigator.mediaSession.playbackState =isPlaying ? "playing" : "paused";

    navigator.mediaSession.setActionHandler("pause", () => {
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
      setIsPlaying(true);
    });

    navigator.mediaSession.setActionHandler("nexttrack", null);
    navigator.mediaSession.setActionHandler("previoustrack", null);
    navigator.mediaSession.setActionHandler("seekbackward", null);
    navigator.mediaSession.setActionHandler("seekforward", null);
    navigator.mediaSession.setActionHandler("seekto", null);
  }, [selectedSound, isPlaying]);

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
                onClick={() => setScreen("soundscape")}
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
                className="text-sm text-white/60"
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
                    onClick={() => {
                      setMixVolumes((prev) => ({
                        ...prev,
                        [selectedMixSounds[0]]: 0.5,
                        [selectedMixSounds[1]]: 0.5,
                      }));

                      setScreen("soundscapeEdit");
                    }}
                    className="mt-6 w-full rounded-2xl border border-[#40444D] bg-[#2A2D33] py-4 text-base font-medium text-[#D8D8D8] shadow-lg shadow-black/20 transition hover:bg-[#343842]"
                  >
                    Continue
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

                  stopSoundscape();
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
                className="text-sm text-white/60"
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
                  Mix your sound
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
                        className="hibiki-slider w-full"
                      />
                    </div>
                  ))}
              </div>

              {/* 👇 Sleep Timer（ここに追加） */}
              <div className="mt-6">
                <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-lg space-y-4 min-h-[190px]">
                  <div className="grid grid-cols-3 gap-2">
                    <button
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

                  <div className="flex justify-center">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={async () => {
                          if (isSoundscapePlaying) {
                            stopSoundscape();
                            setIsSoundscapePlaying(false);

                            if (timerRef.current) {
                              clearInterval(timerRef.current);
                              timerRef.current = null;
                            }

                            return;
                          }

                          await unlockHowlerAudio();

                          stopSoundscape();
                          await startSoundscape();

                          setIsSoundscapePlaying(true);
                          setIsSoundscapeTimerRunning(true);

                          if (timerRef.current) {
                            clearInterval(timerRef.current);
                          }

                          timerRef.current = setInterval(() => {
                            setSoundscapeTimeLeft((prev) => {
                              if (prev <= 1) {
                                clearInterval(timerRef.current!);
                                timerRef.current = null;

                                stopSoundscape();
                                setIsSoundscapePlaying(false);
                                setIsSoundscapeTimerRunning(false);
                                setSelectedSoundscapeTimer(null);

                                return 0;
                              }

                              return prev - 1;
                            });
                          }, 1000);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 active:scale-[0.98]"
                      >
                        <Pause size={16} />
                      </button>
                    </div>
                  </div>
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
                  Privacy, Terms and Support
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
                className="text-sm text-white/60"
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
                    {getSoundConfig().title}
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-white/60">
                    {getSoundConfig().subtitle}
                  </p>
                </div>
              </div>
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
