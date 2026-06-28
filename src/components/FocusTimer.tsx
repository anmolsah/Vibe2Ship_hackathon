import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2, Sparkles, Wind, Brain, Flame } from "lucide-react";

export default function FocusTimer({ onCompleteTask }: { onCompleteTask?: () => void }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [ambientSound, setAmbientSound] = useState<string>("off");
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<"Inhale" | "Hold" | "Exhale">("Inhale");
  const [breathingSeconds, setBreathingSeconds] = useState(4);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<any[]>([]);

  const stopAudio = () => {
    activeSourcesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch (e) {}
      try {
        node.disconnect();
      } catch (e) {}
    });
    activeSourcesRef.current = [];
  };

  // Web Audio API Ambient Waves Synthesizer
  useEffect(() => {
    stopAudio();

    if (isRunning && ambientSound !== "off") {
      // Initialize AudioContext on demand inside user action / running scope
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      try {
        if (ambientSound === "binaural") {
          // Binaural beats (Gamma waves: 150Hz and 190Hz for a 40Hz difference)
          const oscL = ctx.createOscillator();
          const oscR = ctx.createOscillator();
          const merger = ctx.createChannelMerger(2);
          const gainNode = ctx.createGain();

          oscL.frequency.value = 150;
          oscR.frequency.value = 190;

          oscL.connect(merger, 0, 0);
          oscR.connect(merger, 0, 1);
          merger.connect(gainNode);
          gainNode.connect(ctx.destination);

          gainNode.gain.value = 0.12;
          oscL.start(0);
          oscR.start(0);

          activeSourcesRef.current.push(oscL, oscR, merger, gainNode);
        } else if (ambientSound === "brownian") {
          // Brownian noise (warm, deep rumble)
          const bufferSize = 2 * ctx.sampleRate;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
          }

          const noiseNode = ctx.createBufferSource();
          noiseNode.buffer = noiseBuffer;
          noiseNode.loop = true;

          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 350;

          const gainNode = ctx.createGain();
          gainNode.gain.value = 0.25;

          noiseNode.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(ctx.destination);

          noiseNode.start(0);
          activeSourcesRef.current.push(noiseNode, filter, gainNode);
        } else if (ambientSound === "rain") {
          // Cosmic Rainstorm (Lowpass white noise for rain, sweeping bandpass white noise for wind)
          const bufferSize = 2 * ctx.sampleRate;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }

          // Rain
          const rainSource = ctx.createBufferSource();
          rainSource.buffer = noiseBuffer;
          rainSource.loop = true;

          const rainFilter = ctx.createBiquadFilter();
          rainFilter.type = "lowpass";
          rainFilter.frequency.value = 750;

          const rainGain = ctx.createGain();
          rainGain.gain.value = 0.08;

          rainSource.connect(rainFilter);
          rainFilter.connect(rainGain);
          rainGain.connect(ctx.destination);
          rainSource.start(0);
          activeSourcesRef.current.push(rainSource, rainFilter, rainGain);

          // Sweeping wind
          const windSource = ctx.createBufferSource();
          windSource.buffer = noiseBuffer;
          windSource.loop = true;

          const windFilter = ctx.createBiquadFilter();
          windFilter.type = "bandpass";
          windFilter.Q.value = 2.5;

          const windGain = ctx.createGain();
          windGain.gain.value = 0.05;

          windSource.connect(windFilter);
          windFilter.connect(windGain);
          windGain.connect(ctx.destination);
          windSource.start(0);
          activeSourcesRef.current.push(windSource, windFilter, windGain);

          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.08;
          const lfoGain = ctx.createGain();
          lfoGain.gain.value = 250;

          lfo.connect(lfoGain);
          lfoGain.connect(windFilter.frequency);
          lfo.start(0);
          activeSourcesRef.current.push(lfo, lfoGain);
        }
      } catch (err) {
        console.warn("Could not start ambient focus wave synthesizer:", err);
      }
    }

    return () => {
      stopAudio();
    };
  }, [isRunning, ambientSound]);

  // General Audio Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch (e) {}
      }
    };
  }, []);

  // Pomodoro logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            const nextMode = mode === "work" ? "break" : "work";
            setMode(nextMode);
            setTimeLeft(nextMode === "work" ? 25 * 60 : 5 * 60);
            if (onCompleteTask && mode === "work") {
              onCompleteTask();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode]);

  // Breathing Guide loop (4s inhale, 4s hold, 4s exhale)
  useEffect(() => {
    let breathingInterval: NodeJS.Timeout;
    if (isBreathing) {
      breathingInterval = setInterval(() => {
        setBreathingSeconds((prev) => {
          if (prev <= 1) {
            setBreathingPhase((currentPhase) => {
              if (currentPhase === "Inhale") return "Hold";
              if (currentPhase === "Hold") return "Exhale";
              return "Inhale";
            });
            return 4; // Reset phase counter
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(breathingInterval);
  }, [isBreathing]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === "work" ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = ((mode === "work" ? 25 * 60 : 5 * 60) - timeLeft) / (mode === "work" ? 25 * 60 : 5 * 60) * 100;

  return (
    <div id="focus-timer-container" className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/90">Deep Focus Engine</h2>
        </div>
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
          mode === "work" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"
        }`}>
          {mode === "work" ? "Focus Block" : "Recharge Interval"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Timer Ring (Col-5) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-4 border-white/5 shadow-inner">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="74"
                stroke="currentColor"
                className="text-indigo-500/20"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r="74"
                stroke="currentColor"
                className="text-indigo-500 transition-all duration-1000"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="465"
                strokeDashoffset={465 - (465 * progressPercent) / 100}
              />
            </svg>
            <div className="text-center z-10">
              <span className="text-3xl font-mono font-bold tracking-tight text-white">{formatTime(timeLeft)}</span>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                {isRunning ? "Engine Live" : "Idle"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={toggleTimer}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isRunning ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30" : "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500"
              }`}
            >
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
            <button
              onClick={resetTimer}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white/60 flex items-center justify-center hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Focus Audio & Breathing (Col-7) */}
        <div className="md:col-span-7 flex flex-col gap-4 self-stretch justify-between">
          {/* Ambient Noise Selector */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-white/70">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <span>Synthetic Focus Waves</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "off", label: "Mute Ambient" },
                { id: "binaural", label: "Binaural Beats (40Hz)" },
                { id: "rain", label: "Cosmic Rainstorm" },
                { id: "brownian", label: "Brownian Noise" },
              ].map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => {
                    setAmbientSound(sound.id);
                    if (!audioCtxRef.current) {
                      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                    }
                    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
                      audioCtxRef.current.resume();
                    }
                  }}
                  className={`text-[11px] py-1.5 px-2 rounded-lg text-left transition-all border ${
                    ambientSound === sound.id
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                      : "bg-black/20 text-white/50 border-transparent hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  {sound.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calming Breathing Guide for Panic Grounding */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col justify-between flex-1">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
                <Wind className="w-4 h-4 text-purple-400" />
                <span>Anti-Anxiety Reset</span>
              </div>
              <button
                onClick={() => {
                  setIsBreathing(!isBreathing);
                  if (!isBreathing) {
                    setBreathingPhase("Inhale");
                    setBreathingSeconds(4);
                  }
                }}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                  isBreathing
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                }`}
              >
                {isBreathing ? "Disable" : "Begin"}
              </button>
            </div>

            {isBreathing ? (
              <div className="flex items-center gap-4 py-1">
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-10 h-10 rounded-full border border-purple-500/30 bg-purple-500/10 transition-all duration-[4000ms] ${
                      breathingPhase === "Inhale"
                        ? "scale-125 bg-purple-500/25 shadow-lg shadow-purple-500/20"
                        : breathingPhase === "Exhale"
                        ? "scale-90"
                        : "scale-115"
                    }`}
                  />
                  <span className="absolute text-[11px] font-mono font-bold text-white/90">
                    {breathingSeconds}s
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-300 uppercase tracking-widest">
                    {breathingPhase}
                  </div>
                  <p className="text-[10px] text-white/40">
                    {breathingPhase === "Inhale" && "Draw in calm, deep breaths."}
                    {breathingPhase === "Hold" && "Retain awareness & settle thoughts."}
                    {breathingPhase === "Exhale" && "Slowly release stress and urgency."}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-white/40 leading-relaxed pt-1">
                Trigger our synchronized box-breathing cycle to reduce amygdala panic triggers and reclaim full high-yield productivity.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
