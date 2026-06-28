import React, { useState } from "react";
import { Sparkles, FileText, Compass, Mail, AlertTriangle, Play, Check, Copy, RefreshCw, Layers } from "lucide-react";
import { Task } from "../types";

export default function AICommandCenter({
  tasks,
  onAddTasksFromActionItems
}: {
  tasks: Task[];
  onAddTasksFromActionItems?: (items: string[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<"summarizer" | "roadmap" | "email" | "risk">("summarizer");

  // State for Meeting Summarizer
  const [meetingNotes, setMeetingNotes] = useState("");
  const [summarizerLoading, setSummarizerLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState<{ summary: string; actionItems: string[] } | null>(null);

  // State for Roadmap Generator
  const [roadmapGoal, setRoadmapGoal] = useState("");
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapResult, setRoadmapResult] = useState<{ title: string; steps: string[] }[] | null>(null);

  // State for Email Writer
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailContext, setEmailContext] = useState("");
  const [emailTone, setEmailTone] = useState("professional");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult, setEmailResult] = useState<{ subject: string; body: string } | null>(null);

  // State for Risk Predictor
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskResult, setRiskResult] = useState<{ riskScore: number; explanation: string } | null>(null);

  // Copy helper
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // 1. RUN MEETING SUMMARIZER
  const runSummarizer = async () => {
    if (!meetingNotes.trim()) return;
    setSummarizerLoading(true);
    try {
      const res = await fetch("/api/tools/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: meetingNotes })
      });
      const data = await res.json();
      setSummaryResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSummarizerLoading(false);
    }
  };

  // 2. RUN ROADMAP GENERATOR
  const runRoadmap = async () => {
    if (!roadmapGoal.trim()) return;
    setRoadmapLoading(true);
    try {
      const res = await fetch("/api/tools/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: roadmapGoal })
      });
      const data = await res.json();
      setRoadmapResult(data.milestones || []);
    } catch (err) {
      console.error(err);
    } finally {
      setRoadmapLoading(false);
    }
  };

  // 3. RUN EMAIL WRITER
  const runEmailWriter = async () => {
    if (!emailContext.trim()) return;
    setEmailLoading(true);
    try {
      const res = await fetch("/api/tools/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: emailRecipient, context: emailContext, tone: emailTone })
      });
      const data = await res.json();
      setEmailResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setEmailLoading(false);
    }
  };

  // 4. RUN RISK PREDICTOR
  const runRiskPredictor = async () => {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) return;
    setRiskLoading(true);
    try {
      const remainingHours = 24; // approximate standard offset
      const res = await fetch("/api/tools/predict-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          urgency: task.urgency,
          importance: task.importance,
          effort: task.effort,
          remainingHours
        })
      });
      const data = await res.json();
      setRiskResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRiskLoading(false);
    }
  };

  return (
    <div id="ai-command-center" className="glass-card rounded-2xl border border-white/5 flex flex-col overflow-hidden h-[540px]">
      {/* Tab Selectors */}
      <div className="flex border-b border-white/5 bg-[#050505]/40">
        {[
          { id: "summarizer", label: "Meeting Summarizer", icon: FileText },
          { id: "roadmap", label: "Roadmap Gen", icon: Compass },
          { id: "email", label: "Email Writer", icon: Mail },
          { id: "risk", label: "Risk Predictor", icon: AlertTriangle },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-400 bg-white/[0.02]"
                  : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.01]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Container */}
      <div className="flex-1 p-5 overflow-y-auto">
        {/* 1. MEETING SUMMARIZER TAB */}
        {activeTab === "summarizer" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white/90">Deconstruct Meeting Minutes</h3>
              <p className="text-[11px] text-white/40">Paste raw chat logs or notes. Gemini will extract deep summaries and action items.</p>
            </div>
            <textarea
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              placeholder="e.g. Discussed Q4 launch delays. Jane will rewrite the API schemas. Alex needs to finish the final deck due tomorrow morning."
              className="w-full h-24 glass-input rounded-xl p-3 text-xs resize-none"
            />
            <button
              onClick={runSummarizer}
              disabled={summarizerLoading || !meetingNotes.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {summarizerLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Extract High-Yield Summary
            </button>

            {summaryResult && (
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Executive Summary</h4>
                  <p className="text-xs text-white/80 mt-1 leading-relaxed">{summaryResult.summary}</p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Action Items</h4>
                    {onAddTasksFromActionItems && summaryResult.actionItems.length > 0 && (
                      <button
                        onClick={() => onAddTasksFromActionItems(summaryResult.actionItems)}
                        className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Layers className="w-3 h-3" /> Insert as Tasks
                      </button>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {summaryResult.actionItems.map((item, idx) => (
                      <li key={idx} className="text-xs text-white/70 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. ROADMAP GENERATOR TAB */}
        {activeTab === "roadmap" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white/90">AI Project Roadmap Generator</h3>
              <p className="text-[11px] text-white/40">Enter a major goal or milestone (e.g. 'Build a SaaS'). Gemini will build a 3-phase strategic roadmap.</p>
            </div>
            <input
              type="text"
              value={roadmapGoal}
              onChange={(e) => setRoadmapGoal(e.target.value)}
              placeholder="e.g. Launch AI Chief of Staff App on Product Hunt"
              className="w-full glass-input rounded-xl px-3 py-2.5 text-xs"
            />
            <button
              onClick={runRoadmap}
              disabled={roadmapLoading || !roadmapGoal.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {roadmapLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Compass className="w-3.5 h-3.5" />}
              Generate Milestone Roadmap
            </button>

            {roadmapResult && (
              <div className="space-y-3">
                {roadmapResult.map((milestone, mIdx) => (
                  <div key={mIdx} className="p-3.5 bg-[#0a0a0a] border border-white/5 rounded-xl flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {mIdx + 1}
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-white/90">{milestone.title}</h4>
                      <div className="space-y-1 pl-2 border-l border-white/10">
                        {milestone.steps?.map((step, sIdx) => (
                          <p key={sIdx} className="text-[11px] text-white/50">• {step}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. EMAIL WRITER TAB */}
        {activeTab === "email" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white/90">Instant Outbound Email Assistant</h3>
              <p className="text-[11px] text-white/40">Draft apologies, updates, or delay management notes automatically to clear anxiety.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Recipient</label>
                <input
                  type="text"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="e.g. Professor Smith, Client"
                  className="w-full glass-input rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Tone</label>
                <select
                  value={emailTone}
                  onChange={(e) => setEmailTone(e.target.value)}
                  className="w-full glass-input rounded-lg px-3 py-1.5 text-xs bg-[#050505]"
                >
                  <option value="professional">Professional / Crisp</option>
                  <option value="apologetic">Deeply Apologetic</option>
                  <option value="casual">Casual / Friendly</option>
                  <option value="assertive">Assertive / Clear</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Delay Context</label>
              <textarea
                value={emailContext}
                onChange={(e) => setEmailContext(e.target.value)}
                placeholder="e.g. The database server crashed, so I will need 12 more hours to submit."
                className="w-full h-14 glass-input rounded-xl p-2.5 text-xs resize-none"
              />
            </div>
            <button
              onClick={runEmailWriter}
              disabled={emailLoading || !emailContext.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {emailLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Draft Priora Message
            </button>

            {emailResult && (
              <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 relative">
                <button
                  onClick={() => handleCopy(`${emailResult.subject}\n\n${emailResult.body}`, "email")}
                  className="absolute right-3 top-3 text-[10px] px-2 py-1 bg-white/5 rounded hover:bg-white/10 flex items-center gap-1 text-white/60"
                >
                  {copiedText === "email" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copiedText === "email" ? "Copied" : "Copy"}
                </button>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-indigo-400 font-bold block">Subject:</span>
                  <div className="text-xs font-semibold text-white/90 mt-0.5">{emailResult.subject}</div>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-purple-400 font-bold block mb-1">Body:</span>
                  <div className="text-xs text-white/70 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto pr-1">
                    {emailResult.body}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. RISK PREDICTOR TAB */}
        {activeTab === "risk" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white/90">AI Deadline Risk Predictor</h3>
              <p className="text-[11px] text-white/40">Select an upcoming task. Gemini will run predictive models over urgency, complexity, and backlog to forecast risks.</p>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 block mb-1.5">Select Task to Analyze</label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-xs bg-[#050505]"
              >
                <option value="">-- Choose an outstanding task --</option>
                {tasks.filter(t => t.status !== "COMPLETED").map(t => (
                  <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                ))}
              </select>
            </div>

            <button
              onClick={runRiskPredictor}
              disabled={riskLoading || !selectedTaskId}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {riskLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              Execute Predictive Analysis
            </button>

            {riskResult && (
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/70">Calculated Failure Probability</span>
                  <span className={`text-lg font-mono font-bold ${
                    riskResult.riskScore > 75 ? "text-red-400" : riskResult.riskScore > 40 ? "text-amber-400" : "text-green-400"
                  }`}>
                    {riskResult.riskScore}%
                  </span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      riskResult.riskScore > 75 ? "bg-red-500" : riskResult.riskScore > 40 ? "bg-amber-500" : "bg-green-500"
                    }`}
                    style={{ width: `${riskResult.riskScore}%` }}
                  />
                </div>
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <span className="text-[9px] uppercase tracking-widest text-indigo-400 font-bold">Priora Recommendation</span>
                  <p className="text-xs text-white/80 leading-relaxed italic">{riskResult.explanation}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
