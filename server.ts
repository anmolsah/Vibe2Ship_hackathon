import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined. Using smart mock fallback mode.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API HEALTH CHECK
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 1. EMERGENCY TRIAGE & DECONSTRUCTION (LMLS)
  app.post("/api/lmls-triage", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ai = getGemini();
    if (!ai) {
      // Fallback response matching the exact additional instructions schema
      return res.json(getMockTriageResponse(prompt));
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are the Last-Minute Life Saver (LMLS) Core Engine. Analyze the user's panic input, syllabus, or deadline description and output a complete triage and micro-tasking deconstruction.
User input: "${prompt}"

Current time: ${new Date().toISOString()}`,
        config: {
          systemInstruction: `You are the "Last-Minute Life Saver" (LMLS) Core Engine—an elite, autonomous, AI-powered productivity companion. You do not just give advice; you proactively intervene, organize, and execute tasks for users who are overwhelmed, procrastinating, or facing imminent deadlines.
Your primary goal is to move the user from a state of "panic/inaction" to "immediate productive action."

Steps:
1. Urgency & Emotional Triage (The "Panic" Assessor): Evaluate deadline (Critical, High, Medium, Low), estimate total time, and write a 2-sentence firm, empathetic psychological grounding message.
2. Intelligent Deconstruction (Micro-Tasking): Break the user's goals into micro-tasks (10-25 minutes each) to reduce friction.
3. Autonomous Execution: For tasks, provide actual assistance (thesis statement, detailed study terms list, drafted letter, core concepts outline, etc.) inside 'ai_generated_artifact'.
4. UI/UX Context Mapping: Dictate ui_mode ("PANIC_MODE", "FOCUS_EDITOR", "STANDARD_DASHBOARD", "SCHEDULER") and visual hex color based on urgency (e.g. Red, Orange, Amber, Slate).

You MUST respond in strict compliance with the requested schema. Ensure all fields are filled.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              triage: {
                type: Type.OBJECT,
                properties: {
                  urgency_level: {
                    type: Type.STRING,
                    description: "CRITICAL | HIGH | MEDIUM | LOW"
                  },
                  estimated_total_time_minutes: {
                    type: Type.INTEGER
                  },
                  psychological_grounding_message: {
                    type: Type.STRING
                  }
                },
                required: ["urgency_level", "estimated_total_time_minutes", "psychological_grounding_message"]
              },
              ui_orchestration: {
                type: Type.OBJECT,
                properties: {
                  ui_mode: {
                    type: Type.STRING,
                    description: "PANIC_MODE | FOCUS_EDITOR | STANDARD_DASHBOARD | SCHEDULER"
                  },
                  suggested_theme_color: {
                    type: Type.STRING
                  }
                },
                required: ["ui_mode", "suggested_theme_color"]
              },
              action_plan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    step_number: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    duration_minutes: { type: Type.INTEGER },
                    is_autonomous_assist_available: { type: Type.BOOLEAN },
                    ai_generated_artifact: {
                      type: Type.STRING,
                      description: "Drafted thesis outline, core formulas, summary, or email text. If none, null."
                    }
                  },
                  required: ["step_number", "title", "duration_minutes", "is_autonomous_assist_available"]
                }
              },
              calendar_integration: {
                type: Type.OBJECT,
                properties: {
                  suggested_block_start: { type: Type.STRING },
                  requires_cancellation_of_other_events: { type: Type.BOOLEAN }
                },
                required: ["suggested_block_start", "requires_cancellation_of_other_events"]
              }
            },
            required: ["triage", "ui_orchestration", "action_plan", "calendar_integration"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response text from Gemini");
      }
      res.json(JSON.parse(text));
    } catch (error) {
      console.error("Gemini triage error:", error);
      res.json(getMockTriageResponse(prompt));
    }
  });

  // 2. COACHING CHAT ASSISTANT
  app.post("/api/assistant/chat", async (req, res) => {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ai = getGemini();
    if (!ai) {
      return res.json({ text: getMockChatResponse(message) });
    }

    try {
      const chatHistory = (history || []).map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }));

      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: "You are the 'Deadline Guardian AI' - a highly professional, elite Chief of Staff. You do not just list tasks; you proactively advise users on how to make better decisions, schedule realistically, and complete high-risk tasks. Be extremely actionable, encouraging, but realistic. Keep answers concise, beautiful, and highly structured (use lists, bold texts, and clear headers)."
        },
        history: chatHistory
      });

      const response = await chat.sendMessage({ message });
      res.json({ text: response.text });
    } catch (error) {
      console.error("Gemini chat error:", error);
      res.json({ text: getMockChatResponse(message) });
    }
  });

  // 3. TASK SUBTASK BREAKDOWN
  app.post("/api/tools/breakdown", async (req, res) => {
    const { title, description } = req.body;
    const ai = getGemini();
    if (!ai) {
      return res.json({
        subtasks: [
          "Understand requirements and constraints",
          "Set up the baseline template structure",
          "Implement core interface widgets",
          "Test edge cases and performance"
        ]
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Break down the following task into 4-6 small, concrete, actionable subtasks.
Task Title: ${title}
Description: ${description || "No description provided"}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subtasks: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["subtasks"]
          }
        }
      });
      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("Gemini breakdown error:", error);
      res.json({
        subtasks: [
          "Understand requirements and constraints",
          "Set up the baseline template structure",
          "Implement core interface widgets",
          "Test edge cases and performance"
        ]
      });
    }
  });

  // 4. MEETING SUMMARIZER
  app.post("/api/tools/summarize", async (req, res) => {
    const { notes } = req.body;
    if (!notes) {
      return res.status(400).json({ error: "Notes are required" });
    }

    const ai = getGemini();
    if (!ai) {
      return res.json({
        summary: "Weekly sync regarding launch. Standard metrics are positive, but deadline pressure exists.",
        actionItems: [
          "Refactor database schema to handle higher scale",
          "Draft user onboarding flow in Figma",
          "Integrate real-time notification gateway"
        ]
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Summarize these meeting notes and extract key actionable items with assignee if available.
Notes:
${notes}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              actionItems: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["summary", "actionItems"]
          }
        }
      });
      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("Gemini summarizer error:", error);
      res.json({
        summary: "Weekly sync regarding launch. Standard metrics are positive, but deadline pressure exists.",
        actionItems: [
          "Refactor database schema to handle higher scale",
          "Draft user onboarding flow in Figma",
          "Integrate real-time notification gateway"
        ]
      });
    }
  });

  // 5. ROADMAP GENERATOR
  app.post("/api/tools/roadmap", async (req, res) => {
    const { goal } = req.body;
    if (!goal) {
      return res.status(400).json({ error: "Goal is required" });
    }

    const ai = getGemini();
    if (!ai) {
      return res.json({
        milestones: [
          { title: "Phase 1: Architecture Design", steps: ["Define data structures", "Choose tech stack", "Set up API structure"] },
          { title: "Phase 2: Core Development", steps: ["Implement auth", "Build master dashboard", "Wire real-time events"] },
          { title: "Phase 3: Testing & Polish", steps: ["Linter sweeps", "Edge testing", "Deploy builds"] }
        ]
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Create a professional project roadmap with 3 logical milestones and 3 actionable steps under each milestone to accomplish this goal:
Goal: "${goal}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              milestones: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    steps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ["title", "steps"]
                }
              }
            },
            required: ["milestones"]
          }
        }
      });
      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("Gemini roadmap error:", error);
      res.json({
        milestones: [
          { title: "Phase 1: Architecture Design", steps: ["Define data structures", "Choose tech stack", "Set up API structure"] },
          { title: "Phase 2: Core Development", steps: ["Implement auth", "Build master dashboard", "Wire real-time events"] },
          { title: "Phase 3: Testing & Polish", steps: ["Linter sweeps", "Edge testing", "Deploy builds"] }
        ]
      });
    }
  });

  // 6. EMAIL WRITER
  app.post("/api/tools/email", async (req, res) => {
    const { recipient, context, tone } = req.body;
    const ai = getGemini();
    if (!ai) {
      return res.json({
        subject: `Regarding: Deadline update on project`,
        body: `Dear ${recipient || "Team"},\n\nI hope this email finds you well. I am writing to provide an update regarding our current timeline and highlight some immediate adjustments we are implementing to ensure a successful, high-quality launch. Let me know if you would like to connect to align on details.\n\nBest regards,\nChief of Staff`
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Draft a professional email based on the following:
Recipient: ${recipient || "unspecified"}
Context: ${context || "unspecified"}
Tone: ${tone || "professional"}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              body: { type: Type.STRING }
            },
            required: ["subject", "body"]
          }
        }
      });
      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("Gemini email error:", error);
      res.json({
        subject: `Regarding: Deadline update on project`,
        body: `Dear ${recipient || "Team"},\n\nI hope this email finds you well. I am writing to provide an update regarding our current timeline and highlight some immediate adjustments we are implementing to ensure a successful, high-quality launch.\n\nBest regards,\nChief of Staff`
      });
    }
  });

  // 7. DEADLINE RISK PREDICTION
  app.post("/api/tools/predict-risk", async (req, res) => {
    const { taskTitle, urgency, importance, effort, remainingHours } = req.body;
    const ai = getGemini();
    if (!ai) {
      const score = Math.min(Math.round(((urgency * 1.5 + effort * 2) / (remainingHours || 1)) * 30), 98);
      return res.json({
        riskScore: score,
        explanation: `With only ${remainingHours} hours remaining, an effort score of ${effort}/10 creates a bottleneck. Immediate deconstruction is recommended.`
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Predict the risk of missing a deadline (0 to 100) and explain why based on these parameters:
Task Name: ${taskTitle}
Urgency rating: ${urgency}/10
Importance rating: ${importance}/10
Effort required rating: ${effort}/10
Remaining hours before deadline: ${remainingHours} hours`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskScore: { type: Type.INTEGER, description: "Risk value between 0 and 100" },
              explanation: { type: Type.STRING, description: "A 1-2 sentence concise risk analysis" }
            },
            required: ["riskScore", "explanation"]
          }
        }
      });
      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("Gemini risk prediction error:", error);
      res.json({
        riskScore: 65,
        explanation: "Risk is high due to tight remaining time relative to complexity. Immediate micro-task planning suggested."
      });
    }
  });

  // Serve static files / Vite asset routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Resilient fallback builders when Gemini is offline or not configured
function getMockTriageResponse(prompt: string): any {
  const isSyllabus = prompt.toLowerCase().includes("syllabus") || prompt.toLowerCase().includes("exam") || prompt.toLowerCase().includes("course");
  const isWork = prompt.toLowerCase().includes("report") || prompt.toLowerCase().includes("presentation") || prompt.toLowerCase().includes("client");

  if (isSyllabus) {
    return {
      triage: {
        urgency_level: "HIGH",
        estimated_total_time_minutes: 110,
        psychological_grounding_message: "Take a deep breath. We have mapped out your course syllabus into 4 high-yield focus blocks. Starting right now secures your peace of mind."
      },
      ui_orchestration: {
        ui_mode: "PANIC_MODE",
        suggested_theme_color: "#F59E0B"
      },
      action_plan: [
        {
          step_number: 1,
          title: "Filter Core Deliverables",
          duration_minutes: 25,
          is_autonomous_assist_available: true,
          ai_generated_artifact: "### High-Yield Study Outline\n- **Module 1**: Fundamental theorems & equations (40% of grade)\n- **Module 2**: Practice case studies & past papers (35% of grade)\n- **Module 3**: Vocabulary & conceptual flashcards (25% of grade)"
        },
        {
          step_number: 2,
          title: "Synthesize Key Study Terms",
          duration_minutes: 35,
          is_autonomous_assist_available: true,
          ai_generated_artifact: "### Cheat-Sheet Terminology\n1. **Core Principle**: Energy is conserved. (Formula: E = mc²)\n2. **Critical Limit**: Delta change should not exceed margin coefficient.\n3. **Practical Application**: Solve using standard matrix decomposition."
        },
        {
          step_number: 3,
          title: "Active Practice Test Drill",
          duration_minutes: 30,
          is_autonomous_assist_available: false,
          ai_generated_artifact: null
        },
        {
          step_number: 4,
          title: "Review Errant Answers",
          duration_minutes: 20,
          is_autonomous_assist_available: false,
          ai_generated_artifact: null
        }
      ],
      calendar_integration: {
        suggested_block_start: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        requires_cancellation_of_other_events: true
      }
    };
  }

  // General critical panic fallback
  return {
    triage: {
      urgency_level: "CRITICAL",
      estimated_total_time_minutes: 85,
      psychological_grounding_message: "Everything you need is fully laid out right here. Turn off notifications, ignore the clutter, and let's conquer the first 20 minutes together."
    },
    ui_orchestration: {
      ui_mode: "PANIC_MODE",
      suggested_theme_color: "#EF4444"
    },
    action_plan: [
      {
        step_number: 1,
        title: "Isolate First Draft Outline",
        duration_minutes: 20,
        is_autonomous_assist_available: true,
        ai_generated_artifact: "### Emergency Outline Draft\n\n**1. Hook & Introduction**:\n   State the problem clearly. Introduce your primary argument.\n\n**2. Core Supporting Points**:\n   - *Evidence A*: Empirical metrics show 45% increase.\n   - *Evidence B*: User feedback highlights efficiency gaps.\n\n**3. Actionable Conclusion**:\n   Summarize immediate remediation steps."
      },
      {
        step_number: 2,
        title: "Draft Core Sections",
        duration_minutes: 40,
        is_autonomous_assist_available: true,
        ai_generated_artifact: "### Sections Completed Draft\n- *Intro*: Time-to-value ratios are slipping under manual scheduling rules.\n- *Body*: Automated deconstruction breaks down paralysis by formatting raw plans into isolated modules.\n- *Summary*: By utilizing the Last-Minute Life Saver, stress is lowered by 60%."
      },
      {
        step_number: 3,
        title: "Format, Edit & Submit",
        duration_minutes: 25,
        is_autonomous_assist_available: false,
        ai_generated_artifact: null
      }
    ],
    calendar_integration: {
      suggested_block_start: new Date().toISOString(),
      requires_cancellation_of_other_events: true
    }
  };
}

function getMockChatResponse(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("hour") || msg.includes("what should i finish")) {
    return `### ⚡ 3-Hour Emergency Execution Strategy

Based on your current deadlines, here is your high-impact schedule:

1. **Focus Session (45 mins)**: Complete the **Presentation Deck** draft. This is your highest *urgency x importance* score.
2. **Short Recharge (10 mins)**: Do a breathing reset to maintain focus.
3. **Execution Block (60 mins)**: Tackle the **Marketing Report Outline**.
4. **Wrap Up (15 mins)**: Send email status update to stakeholders.

**Pro-Tip**: Activate **Focus Mode** right now. I will block notifications and run the timer. Shall we start?`;
  }
  if (msg.includes("weekend") || msg.includes("plan my weekend")) {
    return `### 📅 Optimized Weekend Strategy

Here is a balanced, high-efficiency plan for Saturday & Sunday:

**Saturday - Deep Work & Prep (Total Focus: 3 hours)**
*   **09:00 - 10:30**: Exam Preparation (Block 1 - Core Theory)
*   **10:30 - 11:00**: Break & Active Walk
*   **11:00 - 12:30**: Practical Assignments & Coding Exercises
*   *Afternoon: 100% free for guilt-free rest!*

**Sunday - Maintenance & Launch (Total Focus: 2 hours)**
*   **10:00 - 11:30**: Review next week's assignments & syllabus
*   **11:30 - 12:00**: Grocery/Meal planning (reduces weekday fatigue)

Would you like me to push these blocks directly to your **Calendar**?`;
  }
  if (msg.includes("can i finish") || msg.includes("monday")) {
    return `### 📊 Realistic Feasibility Predictor

**Current Forecast**: **88% Success Probability** if we optimize your schedule.

*   **Total Tasks Outstanding**: 4 tasks
*   **Estimated Effort**: 5.5 hours
*   **Remaining Free Blocks**: 9 hours before Monday

**Bottleneck Detected**: Your *Marketing Analysis* has a high effort score of 8/10. 
**My recommendation**: Break it into 3 subtasks immediately. I can write the core brief for you to jump-start the blank page. 

Do you want me to generate the brief?`;
  }
  if (msg.includes("study plan") || msg.includes("exam")) {
    return `### 🎓 High-Yield Exam Study Blueprint

To maximize retention and performance under tight deadlines, we will use **Spaced Retrieval**:

1. **Block 1: Cheat Sheet Synthesis (45 mins)**
   * Summarize the entire syllabus into 1 page of core formulas, concepts, and keywords. (I can help you outline this!)
2. **Block 2: Active Recall Practice (60 mins)**
   * Test yourself on high-probability questions. No reading notes—only active testing.
3. **Block 3: Weakness Patching (30 mins)**
   * Review only what you got wrong. Ignore concepts you already understand.

I have set this up as a 3-part study track. Shall we launch **Focus Mode** on Block 1?`;
  }

  return `Hello! As your **AI Chief of Staff**, I'm monitoring all your deadline risks and schedule blocks.

Here is what you can ask me to do:
- **"I have 2 hours, what should I finish?"** (I'll calculate the highest-impact task)
- **"Plan my weekend"** (I'll create structured blocks with built-in recharge breaks)
- **"Draft a study guide for my exam"** (I'll create a spaced retrieval study plan)
- **"Am I on track for Monday?"** (I'll run a deadline risk prediction)

Let me know how I can clear your roadblocks right now!`;
}

startServer();
