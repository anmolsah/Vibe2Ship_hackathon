import React, { useState } from "react";
import { Sparkles, AlertOctagon, Heart, Play, CheckCircle2, ChevronRight, Copy, Check, Calendar, HelpCircle } from "lucide-react";
import { TriageResult } from "../types";

export default function LMLSEngine({
  onTriageComplete,
  onActivatePanicTheme
}: {
  onTriageComplete?: (result: TriageResult) => void;
  onActivatePanicTheme?: (color: string) => void;
}) {
  const [panicQuery, setPanicQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handlePanicSubmit = async () => {
    if (!panicQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/lmls-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: panicQuery })
      });
      const data: TriageResult = await res.json();
      setResult(data);
      setCompletedSteps([]);
      setSelectedStepIndex(0); // auto-expand first step
      
      if (onTriageComplete) onTriageComplete(data);
      if (onActivatePanicTheme && data.ui_orchestration?.suggested_theme_color) {
        onActivatePanicTheme(data.ui_orchestration.suggested_theme_color);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyArtifact = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleStepCompleted = (stepNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedSteps(prev =>
      prev.includes(stepNumber) ? prev.filter(n => n !== stepNumber) : [...prev, stepNumber]
    );
  };

  return (
    <div id="lmls-engine-root" className="glass-card rounded-2xl border border-red-500/20 overflow-hidden shadow-2xl relative">
      {/* Absolute warning badge */}
      <div className="absolute top-0 right-0 bg-red-600/10 text-red-400 text-[9px] uppercase tracking-wider px-3 py-1 font-black border-l border-b border-red-500/20 rounded-bl-xl flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Emergency Service
      </div>

      <div className="p-5 md:p-6 space-y-6">
        {/* Header Title */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-red-400">
            <AlertOctagon className="w-5 h-5 text-red-500 panic-pulse rounded-full" />
            <h2 className="text-base font-bold font-display uppercase tracking-wider text-red-400">Last-Minute Life Saver Engine</h2>
          </div>
          <p className="text-xs text-white/50 leading-relaxed max-w-xl">
            Overwhelmed? Jammed syllabus or an imminent presentation? Describe your deadline in natural language or paste your assignment prompt, and our Chief of Staff will take the wheel.
          </p>
        </div>

        {/* Action input bar */}
        {!result ? (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={panicQuery}
                onChange={(e) => setPanicQuery(e.target.value)}
                placeholder="e.g. My machine learning essay is due tomorrow morning at 8am. I haven't started. I have 3 hours to work tonight."
                className="w-full h-24 glass-input rounded-xl p-3 text-xs resize-none placeholder-white/20 border-red-500/10 focus:border-red-500/40"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className="text-[10px] text-white/30 italic">Autopilot On</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePanicSubmit}
                disabled={loading || !panicQuery.trim()}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Engaging Cognitive Offload...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current text-amber-300 animate-pulse" />
                    Deconstruct & Rescue My Schedule
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-fadeIn">
            {/* Triage / Grounding panel */}
            <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20 flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
                <Heart className="w-6 h-6 fill-current text-red-500" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                    result.triage?.urgency_level === "CRITICAL" ? "bg-red-500 text-white" : "bg-amber-500 text-black"
                  }`}>
                    {result.triage?.urgency_level} SEVERITY
                  </span>
                  <span className="text-[11px] text-white/40">Total Estimated Commitment: <strong className="text-white font-mono">{result.triage?.estimated_total_time_minutes} minutes</strong></span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed font-medium italic">
                  "{result.triage?.psychological_grounding_message}"
                </p>
              </div>
              <button
                onClick={() => setResult(null)}
                className="text-[10px] text-white/40 hover:text-white px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 flex-shrink-0"
              >
                Triage Again
              </button>
            </div>

            {/* Steps & Artifacts split layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left: Interactive Micro-Task List */}
              <div className="lg:col-span-6 space-y-2.5">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Your Linear Micro-Blocks</h3>
                <div className="space-y-2">
                  {result.action_plan?.map((step, idx) => {
                    const isCompleted = completedSteps.includes(step.step_number);
                    const isSelected = selectedStepIndex === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedStepIndex(idx)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-left flex gap-3 items-center justify-between ${
                          isSelected
                            ? "bg-indigo-500/5 border-indigo-500/30"
                            : isCompleted
                            ? "bg-green-500/5 border-green-500/20 opacity-70"
                            : "bg-[#050505]/60 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => toggleStepCompleted(step.step_number, e)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                              isCompleted
                                ? "bg-green-500/20 border-green-500/50 text-green-400"
                                : "border-white/20 hover:border-white/40 text-transparent hover:text-white/20"
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <div>
                            <h4 className={`text-xs font-bold ${isCompleted ? "line-through text-white/30" : "text-white/90"}`}>
                              {step.step_number}. {step.title}
                            </h4>
                            <span className="text-[10px] text-white/40">{step.duration_minutes} minutes block</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {step.is_autonomous_assist_available && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 font-bold uppercase rounded border border-amber-500/20">
                              AI Assist
                            </span>
                          )}
                          <ChevronRight className={`w-3.5 h-3.5 text-white/20 transition-transform ${isSelected ? "rotate-90 text-indigo-400" : ""}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: AI Execution Artifact (Overcoming the blank page) */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="glass-card rounded-xl border border-white/5 p-4 flex-1 flex flex-col min-h-[220px]">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3">
                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">AI Autonomous Artifact</span>
                    {selectedStepIndex !== null && result.action_plan?.[selectedStepIndex]?.ai_generated_artifact && (
                      <button
                        onClick={() => handleCopyArtifact(result.action_plan![selectedStepIndex]!.ai_generated_artifact!, selectedStepIndex)}
                        className="text-[10px] bg-white/5 text-white/60 hover:text-white px-2 py-1 rounded flex items-center gap-1 border border-white/10"
                      >
                        {copiedIndex === selectedStepIndex ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        {copiedIndex === selectedStepIndex ? "Copied" : "Copy Artifact"}
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto text-xs text-white/80 whitespace-pre-line leading-relaxed">
                    {selectedStepIndex !== null && result.action_plan?.[selectedStepIndex] ? (
                      result.action_plan[selectedStepIndex].ai_generated_artifact ? (
                        <div className="font-mono bg-black/40 p-3 rounded-lg border border-white/5 text-slate-300">
                          {result.action_plan[selectedStepIndex].ai_generated_artifact}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-white/30 space-y-1 py-6">
                          <HelpCircle className="w-8 h-8 text-white/10" />
                          <p>No draft artifact required for this physical block.</p>
                          <p className="text-[10px]">Simply execute the timer and tick this step completed!</p>
                        </div>
                      )
                    ) : (
                      <div className="h-full flex items-center justify-center text-center text-white/20 py-12">
                        Select a task step on the left to review its AI execution material.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar suggestion section */}
            {result.calendar_integration && (
              <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/20 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span className="text-white/60">
                    Suggested work block start: <strong className="text-white font-mono">{new Date(result.calendar_integration.suggested_block_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </span>
                </div>
                {result.calendar_integration.requires_cancellation_of_other_events && (
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest px-2 py-0.5 bg-amber-400/10 rounded border border-amber-400/20">
                    Schedule Conflict Detected
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
