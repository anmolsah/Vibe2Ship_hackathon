import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Flame,
  Target,
  MessageSquare,
  Timer,
  Compass,
  Mail,
  FileText,
  Brain,
  Zap,
  AlertTriangle,
  Check,
  Plus,
  Search,
  Mic,
  Settings,
  LogOut,
  ChevronRight,
  Clock,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Play,
  Volume2,
  Trash2,
  Filter,
  Grid,
  ChevronLeft,
  User,
  CheckCircle2,
  Moon,
  Sun,
  Activity,
  Award
} from "lucide-react";

import { Task, Habit, Goal, ActivityLog, TriageResult, ChatMessage, ChatSession } from "./types";
import { initialTasks, initialHabits, initialGoals, generateActivityLogs, getRelativeDate } from "./mockData";
import { deleteGoogleCalendarEvent } from "./lib/googleCalendar";
import ReactMarkdown from "react-markdown";
import { motion } from "motion/react";

import {
  initAuth,
  logout,
  loadUserTasks,
  saveUserTask,
  deleteUserTask,
  loadUserHabits,
  saveUserHabit,
  loadUserGoals,
  saveUserGoal,
  loadUserActivityLogs,
  saveUserActivityLog,
  getUserProfile,
  saveUserProfile,
  testConnection,
  loadUserChatSessions,
  saveUserChatSession,
  deleteUserChatSession
} from "./lib/firebase";

// Subcomponents
import FocusTimer from "./components/FocusTimer";
import AICommandCenter from "./components/AICommandCenter";
import LMLSEngine from "./components/LMLSEngine";
import CalendarView from "./components/CalendarView";
import KanbanBoard from "./components/KanbanBoard";
import AuthScreen from "./components/AuthScreen";

export default function App() {
  // --- Auth & User State ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const hasActivelyLoggedIn = useRef(false);

  // --- Persistent State ---
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    return localStorage.getItem("dg_onboarded") === "true";
  });
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("dg_username") || "";
  });
  const [userRole, setUserRole] = useState<string>(() => {
    return localStorage.getItem("dg_userrole") || "Student";
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // --- Goals & Habits Form State ---
  const [habitFormOpen, setHabitFormOpen] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState("Personal");

  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalCategory, setNewGoalCategory] = useState("Work");
  const [newGoalMilestonesText, setNewGoalMilestonesText] = useState("");

  // --- Landing & Auth View State ---
  const [authView, setAuthView] = useState<"landing" | "signup">("landing");

  // --- UI Layouts ---
  const [currentView, setCurrentView] = useState<"dashboard" | "kanban" | "calendar" | "focus" | "ai-suite" | "goals" | "chat" | "settings">("dashboard");
  const [uiMode, setUiMode] = useState<"STANDARD_DASHBOARD" | "PANIC_MODE">("STANDARD_DASHBOARD");
  const [panicThemeColor, setPanicThemeColor] = useState<string>("#EF4444");

  // --- Database connection state ---
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "error">("checking");
  const [dbErrorDetails, setDbErrorDetails] = useState<string | null>(null);

  // --- Chat Assistant State (ChatGPT style multiple sessions) ---
  const [chatInput, setChatInput] = useState("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("dg_chat_sessions");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing chat sessions", e);
      }
    }
    const defaultMsg: ChatMessage = {
      id: "chat-1",
      sender: "assistant",
      text: `Welcome to your Command Room. As your personal AI Chief of Staff, I have calculated your deadline risk profile. How would you like to optimize your performance today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestedPrompts: [
        "I have 3 hours, what should I finish?",
        "Plan my weekend.",
        "Can I finish everything before Monday?",
        "Generate a study plan for exams."
      ]
    };
    return [
      {
        id: "session-default",
        title: "Chief of Staff Intel",
        messages: [defaultMsg],
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedActive = localStorage.getItem("dg_active_session_id");
    if (savedActive) return savedActive;
    return "session-default";
  });

  useEffect(() => {
    localStorage.setItem("dg_chat_sessions", JSON.stringify(chatSessions));
  }, [chatSessions]);

  useEffect(() => {
    localStorage.setItem("dg_active_session_id", activeSessionId);
  }, [activeSessionId]);

  const activeSession = chatSessions.find(s => s.id === activeSessionId) || chatSessions[0] || {
    id: "session-default",
    title: "Chief of Staff Intel",
    messages: []
  };

  const [chatLoading, setChatLoading] = useState(false);

  // --- Voice commands simulation ---
  const [isListening, setIsListening] = useState(false);
  const [voiceNotification, setVoiceNotification] = useState<string | null>(null);

  // --- Add Task Modal ---
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("Work");
  const [newTaskUrgency, setNewTaskUrgency] = useState(5);
  const [newTaskImportance, setNewTaskImportance] = useState(5);
  const [newTaskEffort, setNewTaskEffort] = useState(4);
  const [newTaskDuration, setNewTaskDuration] = useState(60);
  const [newTaskDate, setNewTaskDate] = useState("");
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<string[]>([]);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);

  // --- Auth Listening ---
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        if (token) setGoogleToken(token);
        setIsAuthLoading(false);
      },
      () => {
        setCurrentUser(null);
        setGoogleToken(null);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // --- Check Database connection ---
  useEffect(() => {
    const checkDb = async () => {
      try {
        await testConnection();
        setDbStatus("connected");
      } catch (err: any) {
        console.error("Database check failed:", err);
        setDbStatus("error");
        setDbErrorDetails(err.message || String(err));
      }
    };
    checkDb();
  }, []);

  // --- Firestore Data Loading ---
  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      try {
        // 1. User Profile
        const profile = await getUserProfile(currentUser.uid);
        if (profile) {
          setUserName(profile.name);
          setUserRole(profile.role);
          setIsOnboarded(true);
          localStorage.setItem("dg_onboarded", "true");
          localStorage.setItem("dg_username", profile.name);
          localStorage.setItem("dg_userrole", profile.role);
        } else {
          const fallbackName = currentUser.displayName || currentUser.email?.split("@")[0] || "";
          setUserName(fallbackName);
          setUserRole("Student");
          setIsOnboarded(false);
          localStorage.setItem("dg_onboarded", "false");
        }

        // 2. Load Tasks
        const dbTasks = await loadUserTasks(currentUser.uid);
        if (dbTasks && dbTasks.length > 0) {
          setTasks(dbTasks);
        } else {
          setTasks(initialTasks);
          for (const t of initialTasks) {
            await saveUserTask(currentUser.uid, t);
          }
        }

        // 3. Load Habits
        const dbHabits = await loadUserHabits(currentUser.uid);
        if (dbHabits && dbHabits.length > 0) {
          setHabits(dbHabits);
        } else {
          setHabits(initialHabits);
          for (const h of initialHabits) {
            await saveUserHabit(currentUser.uid, h);
          }
        }

        // 4. Load Goals
        const dbGoals = await loadUserGoals(currentUser.uid);
        if (dbGoals && dbGoals.length > 0) {
          setGoals(dbGoals);
        } else {
          setGoals(initialGoals);
          for (const g of initialGoals) {
            await saveUserGoal(currentUser.uid, g);
          }
        }

        // 5. Load Activity Logs
        const dbLogs = await loadUserActivityLogs(currentUser.uid);
        if (dbLogs && dbLogs.length > 0) {
          setActivityLogs(dbLogs);
        } else {
          const seedLogs = generateActivityLogs();
          setActivityLogs(seedLogs);
          for (const log of seedLogs) {
            await saveUserActivityLog(currentUser.uid, log);
          }
        }

        // 6. Load Chat Sessions
        const dbSessions = await loadUserChatSessions(currentUser.uid);
        if (dbSessions && dbSessions.length > 0) {
          setChatSessions(dbSessions);
        } else {
          const defaultMsg: ChatMessage = {
            id: "chat-1",
            sender: "assistant",
            text: `Welcome to your Command Room. As your personal AI Chief of Staff, I have calculated your deadline risk profile. How would you like to optimize your performance today?`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            suggestedPrompts: [
              "I have 3 hours, what should I finish?",
              "Plan my weekend.",
              "Can I finish everything before Monday?",
              "Generate a study plan for exams."
            ]
          };
          const defaultSession = {
            id: "session-default",
            title: "Chief of Staff Intel",
            messages: [defaultMsg],
            createdAt: new Date().toISOString()
          };
          setChatSessions([defaultSession]);
          await saveUserChatSession(currentUser.uid, defaultSession);
        }
      } catch (err) {
        console.error("Failed to load user firestore documents:", err);
      }
    };

    loadData();
  }, [currentUser]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K opens search chat
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCurrentView("chat");
      }
      // Esc closes modal
      if (e.key === "Escape") {
        setIsAddTaskOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- Computed Analytics ---
  const activeTasks = tasks.filter(t => t.status !== "COMPLETED");
  const completedTasks = tasks.filter(t => t.status === "COMPLETED");
  
  // Calculate dynamic productivity score
  const baseScore = 75;
  const habitCompletionRate = habits.length > 0 ? (habits.filter(h => h.streak > 0).length / habits.length) * 15 : 0;
  const taskCompletionBonus = Math.min(completedTasks.length * 4, 15);
  const criticalPenalty = Math.min(activeTasks.filter(t => t.urgency >= 8).length * 5, 20);
  const productivityScore = Math.max(10, Math.min(100, Math.round(baseScore + habitCompletionRate + taskCompletionBonus - criticalPenalty)));

  // --- Task Operations ---
  const handleUpdateStatus = async (id: string, newStatus: Task["status"]) => {
    let updatedMatchedTask: Task | null = null;
    setTasks(prev =>
      prev.map(t => {
        if (t.id === id) {
          const updated: Task = { ...t, status: newStatus };
          if (newStatus === "COMPLETED") {
            updated.completedAt = new Date().toISOString();
            updated.riskScore = 0;
            triggerActivityLogToday();
          }
          updatedMatchedTask = updated;
          return updated;
        }
        return t;
      })
    );
    // Persist to Firebase if authenticated
    if (currentUser) {
      setTimeout(async () => {
        if (updatedMatchedTask) {
          await saveUserTask(currentUser.uid, updatedMatchedTask);
        }
      }, 50);
    }
  };

  const triggerActivityLogToday = async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    let matchedLog: ActivityLog | null = null;
    setActivityLogs(prev => {
      const exists = prev.some(log => log.date === todayStr);
      let nextLogs = prev;
      if (!exists) {
        nextLogs = [{ date: todayStr, count: 1 }, ...prev];
      } else {
        nextLogs = prev.map(log => (log.date === todayStr ? { ...log, count: log.count + 1 } : log));
      }
      matchedLog = nextLogs.find(log => log.date === todayStr) || null;
      return nextLogs;
    });

    if (currentUser) {
      setTimeout(async () => {
        if (matchedLog) {
          await saveUserActivityLog(currentUser.uid, matchedLog);
        }
      }, 50);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    if (currentUser) {
      await deleteUserTask(currentUser.uid, id);
      // Delete from Google Calendar if event ID is present
      if (googleToken && taskToDelete?.googleCalendarEventId) {
        try {
          await deleteGoogleCalendarEvent(googleToken, taskToDelete.googleCalendarEventId);
        } catch (calendarErr) {
          console.warn("Could not delete associated calendar event:", calendarErr);
        }
      }
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    let updatedMatchedTask: Task | null = null;
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          const subtasks = t.subtasks.map(s => (s.id === subtaskId ? { ...s, completed: !s.completed } : s));
          const updated = { ...t, subtasks };
          updatedMatchedTask = updated;
          return updated;
        }
        return t;
      })
    );

    if (currentUser) {
      setTimeout(async () => {
        if (updatedMatchedTask) {
          await saveUserTask(currentUser.uid, updatedMatchedTask);
        }
      }, 50);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      description: newTaskDesc,
      urgency: newTaskUrgency,
      importance: newTaskImportance,
      effort: newTaskEffort,
      durationMinutes: newTaskDuration,
      dueDate: newTaskDate ? new Date(newTaskDate).toISOString() : getRelativeDate(1),
      category: newTaskCategory,
      status: "TODO",
      riskScore: newTaskUrgency >= 7 ? 65 : 15,
      dependencies: [],
      subtasks: suggestedSubtasks.map((st, i) => ({
        id: `sub-${Date.now()}-${i}`,
        title: st,
        completed: false
      }))
    };

    // Optimistically update tasks local state
    setTasks(prev => [newTask, ...prev]);

    // Reset form and close dialog immediately
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskCategory("Work");
    setNewTaskUrgency(5);
    setNewTaskImportance(5);
    setNewTaskEffort(4);
    setNewTaskDuration(60);
    setNewTaskDate("");
    setSuggestedSubtasks([]);
    setIsAddTaskOpen(false);

    // Save to Firestore in background without blocking
    if (currentUser) {
      try {
        await saveUserTask(currentUser.uid, newTask);
      } catch (err) {
        console.error("Failed to save user task to firestore:", err);
      }
    }
  };

  // Autogenerate subtasks using AI breakdown
  const generateSubtasks = async () => {
    if (!newTaskTitle.trim()) return;
    setIsGeneratingSubtasks(true);
    try {
      const res = await fetch("/api/tools/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle, description: newTaskDesc })
      });
      const data = await res.json();
      if (data.subtasks) {
        setSuggestedSubtasks(data.subtasks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  // --- Habit Operations ---
  const handleToggleHabitToday = async (habitId: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    let updatedMatchedHabit: Habit | null = null;
    setHabits(prev =>
      prev.map(h => {
        if (h.id === habitId) {
          const completed = h.completedDays.includes(todayStr);
          const days = completed
            ? h.completedDays.filter(d => d !== todayStr)
            : [...h.completedDays, todayStr];
          const streakChange = completed ? -1 : 1;
          const updated = {
            ...h,
            completedDays: days,
            streak: Math.max(0, h.streak + streakChange)
          };
          updatedMatchedHabit = updated;
          return updated;
        }
        return h;
      })
    );
    triggerActivityLogToday();

    if (currentUser) {
      setTimeout(async () => {
        if (updatedMatchedHabit) {
          await saveUserHabit(currentUser.uid, updatedMatchedHabit);
        }
      }, 50);
    }
  };

  const handleAddHabit = async (title: string, category: string) => {
    if (!title.trim()) return;
    const newHabit: Habit = {
      id: `habit-${Date.now()}`,
      title,
      frequency: "daily",
      streak: 0,
      completedDays: [],
      category
    };
    setHabits(prev => [...prev, newHabit]);
    if (currentUser) {
      await saveUserHabit(currentUser.uid, newHabit);
    }
  };

  // --- Goal Operations ---
  const handleAddGoal = async (title: string, category: string, milestonesList: string[]) => {
    if (!title.trim()) return;
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      title,
      targetDate: getRelativeDate(30),
      category,
      milestones: milestonesList.map((m, i) => ({
        id: `g-m-${Date.now()}-${i}`,
        title: m,
        completed: false
      })),
      progress: 0
    };
    setGoals(prev => [...prev, newGoal]);
    if (currentUser) {
      await saveUserGoal(currentUser.uid, newGoal);
    }
  };

  const handleToggleMilestone = async (goalId: string, milestoneId: string) => {
    let updatedMatchedGoal: Goal | null = null;
    setGoals(prev =>
      prev.map(g => {
        if (g.id === goalId) {
          const milestones = g.milestones.map(m => (m.id === milestoneId ? { ...m, completed: !m.completed } : m));
          const completedCount = milestones.filter(m => m.completed).length;
          const progress = Math.round((completedCount / milestones.length) * 100);
          const updated = { ...g, milestones, progress };
          updatedMatchedGoal = updated;
          return updated;
        }
        return g;
      })
    );

    if (currentUser) {
      setTimeout(async () => {
        if (updatedMatchedGoal) {
          await saveUserGoal(currentUser.uid, updatedMatchedGoal);
        }
      }, 50);
    }
  };

  // --- AI Chat Actions (ChatGPT style multiple sessions) ---
  const handleNewChat = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: "New Session",
      messages: [
        {
          id: `chat-${Date.now()}`,
          sender: "assistant",
          text: `Starting a fresh cycle. I'm ready to calculate strategies, handle schedules, or analyze your deadline profiles. What are we optimizing?`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggestedPrompts: [
            "Deconstruct my next major milestone.",
            "Draft a status update for my work.",
            "Calculate deadline risk profile.",
            "Give me a focusing sprint template."
          ]
        }
      ],
      createdAt: new Date().toISOString()
    };

    setChatSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSessionId);

    if (currentUser) {
      saveUserChatSession(currentUser.uid, newSession).catch(err => {
        console.error("Failed to save new chat session to Firestore:", err);
      });
    }
  };

  const handleDeleteChat = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = chatSessions.filter(s => s.id !== sessionId);

    if (currentUser) {
      deleteUserChatSession(currentUser.uid, sessionId).catch(err => {
        console.error("Failed to delete chat session from Firestore:", err);
      });
    }

    if (remaining.length === 0) {
      const defaultMsg: ChatMessage = {
        id: "chat-1",
        sender: "assistant",
        text: `Welcome to your Command Room. As your personal AI Chief of Staff, I have calculated your deadline risk profile. How would you like to optimize your performance today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedPrompts: [
          "I have 3 hours, what should I finish?",
          "Plan my weekend.",
          "Can I finish everything before Monday?",
          "Generate a study plan for exams."
        ]
      };
      const fallbackSession = {
        id: "session-default",
        title: "Chief of Staff Intel",
        messages: [defaultMsg],
        createdAt: new Date().toISOString()
      };
      setChatSessions([fallbackSession]);
      setActiveSessionId("session-default");

      if (currentUser) {
        saveUserChatSession(currentUser.uid, fallbackSession).catch(err => {
          console.error("Failed to save fallback chat session to Firestore:", err);
        });
      }
    } else {
      setChatSessions(remaining);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || chatInput;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `chat-usr-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    // Update active session messages
    let updatedSessions = chatSessions.map(session => {
      if (session.id === activeSession.id) {
        const isFirstUserMessage = session.messages.filter(m => m.sender === "user").length === 0;
        const newTitle = isFirstUserMessage ? (query.length > 25 ? query.substring(0, 22) + "..." : query) : session.title;
        return {
          ...session,
          title: newTitle,
          messages: [...session.messages, userMsg]
        };
      }
      return session;
    });

    setChatSessions(updatedSessions);
    if (!textToSend) setChatInput("");
    setChatLoading(true);

    if (currentUser) {
      const activeUpdatedSession = updatedSessions.find(s => s.id === activeSession.id);
      if (activeUpdatedSession) {
        saveUserChatSession(currentUser.uid, activeUpdatedSession).catch(err => {
          console.error("Failed to save user message session to Firestore:", err);
        });
      }
    }

    try {
      const activeSessionMsgs = updatedSessions.find(s => s.id === activeSession.id)?.messages || [];
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, history: activeSessionMsgs })
      });
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `chat-ast-${Date.now()}`,
        sender: "assistant",
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setChatSessions(prev => {
        const nextSessions = prev.map(session => {
          if (session.id === activeSession.id) {
            return {
              ...session,
              messages: [...session.messages, assistantMsg]
            };
          }
          return session;
        });

        if (currentUser) {
          const activeUpdatedSession = nextSessions.find(s => s.id === activeSession.id);
          if (activeUpdatedSession) {
            saveUserChatSession(currentUser.uid, activeUpdatedSession).catch(err => {
              console.error("Failed to save assistant response session to Firestore:", err);
            });
          }
        }

        return nextSessions;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  // --- Real Voice Command with Browser Web Speech API ---
  const triggerVoiceCommand = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setVoiceNotification("Speech recognition is not supported in this browser.");
      setTimeout(() => setVoiceNotification(null), 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotification("Listening... Speak now.");
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setVoiceNotification(`Transcription: "${text}"`);
          setChatInput(text);
          // Wait 1.5 seconds and automatically send it
          setTimeout(() => {
            setVoiceNotification(null);
            handleSendMessage(text);
          }, 1500);
        } else {
          setVoiceNotification("No speech detected. Try again.");
          setTimeout(() => setVoiceNotification(null), 2500);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition error:", event.error);
        if (event.error === 'not-allowed') {
          setVoiceNotification("Microphone permission denied.");
        } else if (event.error === 'no-speech') {
          setVoiceNotification("No speech was detected.");
        } else {
          setVoiceNotification(`Speech Error: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setVoiceNotification(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e: any) {
      console.error("Speech Recognition initialization failed:", e);
      setVoiceNotification("Failed to start Speech Recognition.");
      setTimeout(() => setVoiceNotification(null), 3000);
      setIsListening(false);
    }
  };

  // --- Add Action items from Meeting summary ---
  const handleAddTasksFromActionItems = (items: string[]) => {
    const newTasksList: Task[] = items.map((item, idx) => ({
      id: `task-ai-${Date.now()}-${idx}`,
      title: item,
      urgency: 7,
      importance: 8,
      effort: 5,
      durationMinutes: 45,
      dueDate: getRelativeDate(2),
      category: "Work",
      status: "TODO",
      riskScore: 40,
      dependencies: [],
      subtasks: []
    }));
    setTasks(prev => [...newTasksList, ...prev]);
    setCurrentView("kanban");
  };

  // --- Render Loading Segment ---
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-widest font-bold text-white/50 animate-pulse">Synchronizing Priora Core...</p>
        </div>
      </div>
    );
  }

  // --- Render Authenticated Session Gate or Landing Page ---
  if (!currentUser) {
    if (authView === "landing") {
      return (
        <div id="landing-page" className="min-h-screen bg-[#050505] text-[#ededed] font-sans flex flex-col justify-between overflow-x-hidden relative">
          {/* Dynamic Background Geometry with pulse/move animation */}
          <motion.div 
            animate={{
              scale: [1, 1.15, 1],
              x: [0, 15, 0],
              y: [0, -15, 0]
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" 
          />
          <motion.div 
            animate={{
              scale: [1, 1.2, 1],
              x: [0, -20, 0],
              y: [0, 20, 0]
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" 
          />

          {/* Landing Nav */}
          <header className="h-16 border-b border-[#1a1a1a] flex items-center justify-between px-6 bg-[#0a0a0a]/60 backdrop-blur-md z-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg text-white font-extrabold text-sm">
                P
              </div>
              <span className="font-bold tracking-tight text-lg font-display text-white">Priora</span>
            </motion.div>
            
            <div className="flex items-center gap-4">
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                onClick={() => setAuthView("signup")}
                className="px-4 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white text-indigo-300 text-xs font-bold rounded-xl border border-indigo-500/30 transition-all cursor-pointer hover:scale-[1.03]"
              >
                Login / Sign Up
              </motion.button>
            </div>
          </header>

          {/* Main hero segment */}
          <main className="flex-1 max-w-6xl mx-auto px-6 py-16 flex flex-col lg:flex-row items-center justify-between gap-12 z-10 w-full">
            {/* Left Side: Animative Hero copy & Value props */}
            <div className="flex-1 text-left space-y-8 max-w-xl">
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current text-indigo-400" />
                <span>Next-Gen Autonomous Chief of Staff</span>
              </motion.div>

              <div className="space-y-4">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className="text-4xl md:text-5xl font-black tracking-tight font-display bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent leading-tight"
                >
                  Never Miss a Deadline.<br />
                  <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Reclaim Cognitive Peace.</span>
                </motion.h1>

                <motion.p 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="text-sm md:text-base text-white/50 leading-relaxed"
                >
                  An elite, hyper-intelligent productivity agent that proactively schedules, tracks risk profiles, and deploys Emergency Rescue blocks to guide you from panic to action.
                </motion.p>
              </div>

              {/* Micro value cards in a grid */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="grid grid-cols-2 gap-4 pt-4"
              >
                {[
                  { title: "ChatGPT Co-Pilot", desc: "Interactive strategic consultations" },
                  { title: "Real Voice Mode", desc: "Speak naturally, command instantly" },
                  { title: "High Alert Engine", desc: "Focus sprints when crisis hits" },
                  { title: "Cloud Protected", desc: "Firestore secures all records" }
                ].map((feat, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.03, borderColor: "rgba(99, 102, 241, 0.3)" }}
                    className="p-3.5 bg-white/5 border border-white/5 rounded-2xl transition-all"
                  >
                    <div className="text-xs font-bold text-white mb-0.5">{feat.title}</div>
                    <div className="text-[10px] text-white/40">{feat.desc}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Right Side: Setup / Signup CTA panel */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, x: 30 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
              className="w-full max-w-md bg-[#0a0a0a]/85 border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-xl relative flex flex-col justify-between min-h-[420px]"
            >
              {/* Visual accent bar */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />

              <div className="text-center space-y-2 mt-2">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Brain className="w-6 h-6 animate-pulse text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">Cognitive Hub Awaiting</h3>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Join Priora to synchronize your deadlines, habit metrics, focus schedules, and strategic planner history securely.
                </p>
              </div>

              <div className="space-y-3 bg-white/5 border border-white/5 p-4 rounded-2xl text-left">
                <div className="flex items-center gap-3 text-xs text-white/70">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Real-Time Cloud Synchronization
                </div>
                <div className="flex items-center gap-3 text-xs text-white/70">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  Personalized AI Strategic Advice
                </div>
                <div className="flex items-center gap-3 text-xs text-white/70">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                  Natural Hands-Free Voice Assistant
                </div>
              </div>

              <button
                onClick={() => setAuthView("signup")}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-indigo-500/20 cursor-pointer hover:scale-[1.01]"
              >
                Get Started Instantly
              </button>
            </motion.div>
          </main>

          <footer className="h-12 border-t border-[#1a1a1a] flex items-center justify-center text-[10px] text-white/30 bg-[#050505]">
            &copy; 2026 Priora. Your AI Chief of Staff. All rights reserved.
          </footer>
        </div>
      );
    } else {
      return (
        <div className="relative bg-[#050505] min-h-screen">
          {/* Back to Home Button */}
          <button 
            onClick={() => setAuthView("landing")}
            className="absolute top-6 left-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-[#0d0d10] hover:bg-[#131317] hover:border-indigo-500/50 text-white/70 hover:text-white transition-all text-xs cursor-pointer font-bold shadow-md"
          >
            ← Back to Home
          </button>
          <AuthScreen
            initialIsSignUp={true}
            onAuthSuccess={(user, token) => {
              hasActivelyLoggedIn.current = true;
              setCurrentUser(user);
              if (token) setGoogleToken(token);
              setIsOnboarded(false);
              const namePart = user.displayName || user.email?.split("@")[0] || "";
              setUserName(namePart);
            }}
          />
        </div>
      );
    }
  }

  // --- Render Landing Onboarding (When logged in but not onboarded) ---
  if (!isOnboarded) {
    return (
      <div id="landing-page" className="min-h-screen bg-[#050505] text-[#ededed] font-sans flex flex-col justify-between overflow-x-hidden relative">
        {/* Dynamic Background Geometry with pulse/move animation */}
        <motion.div 
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 15, 0],
            y: [0, -15, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" 
        />
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            x: [0, -20, 0],
            y: [0, 20, 0]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" 
        />

        {/* Landing Nav */}
        <header className="h-16 border-b border-[#1a1a1a] flex items-center justify-between px-6 bg-[#0a0a0a]/60 backdrop-blur-md z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg text-white font-extrabold text-sm">
              P
            </div>
            <span className="font-bold tracking-tight text-lg font-display text-white">Priora</span>
          </motion.div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                logout();
                setCurrentUser(null);
                setAuthView("landing");
              }}
              className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-[10px] font-bold uppercase transition-all border border-white/5 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Main hero segment */}
        <main className="flex-1 max-w-6xl mx-auto px-6 py-16 flex flex-col lg:flex-row items-center justify-between gap-12 z-10 w-full">
          {/* Left Side: Animative Hero copy & Value props */}
          <div className="flex-1 text-left space-y-8 max-w-xl">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current text-indigo-400" />
              <span>Next-Gen Autonomous Chief of Staff</span>
            </motion.div>

            <div className="space-y-4">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-4xl md:text-5xl font-black tracking-tight font-display bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent leading-tight"
              >
                Never Miss a Deadline.<br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Reclaim Cognitive Peace.</span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-sm md:text-base text-white/50 leading-relaxed"
              >
                An elite, hyper-intelligent productivity agent that proactively schedules, tracks risk profiles, and deploys Emergency Rescue blocks to guide you from panic to action.
              </motion.p>
            </div>

            {/* Micro value cards in a grid */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="grid grid-cols-2 gap-4 pt-4"
            >
              {[
                { title: "ChatGPT Co-Pilot", desc: "Interactive strategic consultations" },
                { title: "Real Voice Mode", desc: "Speak naturally, command instantly" },
                { title: "High Alert Engine", desc: "Focus sprints when crisis hits" },
                { title: "Cloud Protected", desc: "Firestore secures all records" }
              ].map((feat, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.03, borderColor: "rgba(99, 102, 241, 0.3)" }}
                  className="p-3.5 bg-white/5 border border-white/5 rounded-2xl transition-all"
                >
                  <div className="text-xs font-bold text-white mb-0.5">{feat.title}</div>
                  <div className="text-[10px] text-white/40">{feat.desc}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Side: Setup / Onboarding panel */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
            className="w-full max-w-md bg-[#0a0a0a]/85 border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-xl relative"
          >
            {/* Visual accent bar */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />

            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white font-display">Onboard Your Chief of Staff</h3>
              <p className="text-[11px] text-white/40">Configure your personal assistant preferences</p>
            </div>
            
            <div className="space-y-4 text-left">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 block mb-1.5">What should I call you?</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 block mb-1.5">Primary Core Profile</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "Student", desc: "Exams, homework & essays" },
                    { id: "Professional", desc: "Corporate syncs & proposals" },
                    { id: "Founder", desc: "Product iterations & investors" },
                    { id: "General", desc: "General daily coordination" }
                  ].map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => setUserRole(profile.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        userRole === profile.id
                          ? "bg-indigo-600/10 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                          : "bg-white/5 border-transparent text-white/60 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-xs font-bold">{profile.id}</div>
                      <div className="text-[9px] text-white/40 mt-0.5 leading-snug">{profile.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                setIsOnboarded(true);
                hasActivelyLoggedIn.current = false;
                localStorage.setItem("dg_onboarded", "true");
                localStorage.setItem("dg_username", userName);
                localStorage.setItem("dg_userrole", userRole);
                if (currentUser) {
                  await saveUserProfile(currentUser.uid, { name: userName, role: userRole });
                }
              }}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-indigo-500/20 cursor-pointer hover:scale-[1.01]"
            >
              Initialize Priora Engine
            </button>
          </motion.div>
        </main>

        <footer className="h-12 border-t border-[#1a1a1a] flex items-center justify-center text-[10px] text-white/30 bg-[#050505]">
          &copy; 2026 Priora. Your AI Chief of Staff. All rights reserved.
        </footer>
      </div>
    );
  }

  // --- Main Chief of Staff Applet View ---
  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] font-sans flex flex-col justify-between overflow-x-hidden select-none">
      {/* Dynamic Panic Ring Layer when in Rescue Mode */}
      {uiMode === "PANIC_MODE" && (
        <div className="fixed inset-0 pointer-events-none border-[12px] border-red-600/30 panic-pulse z-40" />
      )}

      {/* Voice Notification Overlay */}
      {voiceNotification && (
        <div className="fixed bottom-12 right-6 bg-[#0c0c0e] border-2 border-indigo-500 rounded-xl p-4 text-xs shadow-2xl z-50 flex items-center gap-3 animate-fadeIn">
          <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
          <span className="font-semibold text-indigo-300 font-mono">{voiceNotification}</span>
        </div>
      )}

      {/* Top Navigation */}
      <nav className="h-14 border-b border-[#1a1a1a] flex items-center justify-between px-6 bg-[#0a0a0a]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg cursor-pointer text-white font-extrabold text-sm" onClick={() => setCurrentView("dashboard")}>
            P
          </div>
          <span className="font-bold tracking-tight text-lg font-display text-white">Priora</span>
          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] uppercase font-bold rounded border border-indigo-500/20 ml-1">
            {userRole}
          </span>
        </div>

        <div className="flex items-center gap-6">
          {/* High Alert Mode Button */}
          <button
            onClick={() => {
              if (uiMode === "PANIC_MODE") {
                setUiMode("STANDARD_DASHBOARD");
              } else {
                setUiMode("PANIC_MODE");
                setCurrentView("dashboard");
              }
            }}
            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all cursor-pointer ${
              uiMode === "PANIC_MODE"
                ? "bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse"
                : "bg-amber-500/10 border-amber-500/35 text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {uiMode === "PANIC_MODE" ? "Exit High Alert" : "High Alert Mode"}
            </span>
          </button>

          {/* Keyboard kbd shortcut display */}
          <div className="hidden md:flex items-center gap-2 text-[10px] text-white/40">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 font-mono">⌘</kbd>
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 font-mono">K</kbd>
            <span className="text-[9px] uppercase font-bold ml-1">Assistant</span>
          </div>

          <div
            className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 border border-white/20 flex items-center justify-center text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setCurrentView("settings")}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      {/* Primary Workspace */}
      <div className="flex flex-1 overflow-hidden min-h-[calc(100vh-88px)]">
        {/* Sidebar Rail */}
        <aside className="w-16 border-r border-[#1a1a1a] flex flex-col items-center py-6 gap-6 bg-[#080808]">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "kanban", label: "Kanban", icon: CheckSquare },
            { id: "calendar", label: "Calendar", icon: Calendar },
            { id: "focus", label: "Focus Timer", icon: Timer },
            { id: "ai-suite", label: "AI Suite", icon: Compass },
            { id: "goals", label: "Goals & Habits", icon: Target },
            { id: "chat", label: "Coaching Chat", icon: MessageSquare },
            { id: "settings", label: "Settings", icon: Settings },
          ].map(item => {
            const Icon = item.icon;
            const isSelected = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id as any);
                  if (item.id === "dashboard") setUiMode("STANDARD_DASHBOARD");
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group ${
                  isSelected
                    ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-md"
                    : "text-white/40 hover:text-white/80 hover:bg-white/5"
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
                {/* Tooltip */}
                <span className="absolute left-14 scale-0 group-hover:scale-100 bg-[#0c0c0e] text-white text-[10px] px-2 py-1 rounded border border-white/10 whitespace-nowrap transition-all z-50">
                  {item.label}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Dynamic Panel Display */}
        <main className="flex-1 p-5 overflow-y-auto max-w-7xl mx-auto space-y-6">
          
          {/* View Router */}
          {currentView === "dashboard" && (
            <div className="space-y-6">
              {/* Emergency Banner trigger */}
              {uiMode === "STANDARD_DASHBOARD" && activeTasks.some(t => t.urgency >= 8) && (
                <div className="p-4 bg-red-600/10 border border-red-500/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-red-600/25 text-red-400 rounded-lg">
                      <AlertTriangle className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Emergency Situation Detected</h4>
                      <p className="text-[11px] text-white/50">You have high-risk deadlines looming today. Engage rescue mode now.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUiMode("PANIC_MODE")}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-current text-amber-300" />
                    Engage Rescue Autopilot
                  </button>
                </div>
              )}

              {/* HERO BLOCK OR RESCUE CONSOLE */}
              {uiMode === "PANIC_MODE" ? (
                <LMLSEngine
                  onTriageComplete={() => {}}
                  onActivatePanicTheme={(color) => setPanicThemeColor(color)}
                />
              ) : (
                <div className="bg-gradient-to-br from-[#121214] to-[#050505] rounded-2xl p-6 border border-white/5 flex flex-col md:flex-row justify-between items-center shadow-xl gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <h1 className="text-3xl font-extralight tracking-tight text-white/70">
                      Good morning, <span className="font-extrabold text-white">{userName}</span>.
                    </h1>
                    <p className="text-xs text-white/40">
                      You have <strong className="text-indigo-400">{activeTasks.length} active tasks</strong> outstanding. AI prediction anticipates secure completions.
                    </p>
                  </div>
                  
                  {/* Productivity Score radial widget */}
                  <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-black/40 border border-white/10 shadow-lg">
                      <span className="text-2xl font-black text-indigo-500 font-mono">{productivityScore}</span>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Velocity Index</div>
                      <p className="text-[10px] text-white/40">Based on habits & completion streaks</p>
                    </div>
                  </div>
                </div>
              )}

              {/* CORE DASHBOARD GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Focus stack and Heatmap */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Focus Stack list */}
                  <div className="bg-black/30 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4.5 h-4.5 text-red-400" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-white">Urgent Focus Stack</h2>
                      </div>
                      <button
                        onClick={() => setCurrentView("kanban")}
                        className="text-[10px] text-indigo-400 hover:underline"
                      >
                        Launch Kanban
                      </button>
                    </div>

                    <div className="space-y-3">
                      {activeTasks.slice(0, 3).map(task => {
                        const isCritical = task.urgency >= 8;
                        return (
                          <div
                            key={task.id}
                            className="p-4 bg-[#0a0a0c] rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-indigo-500/30 transition-all cursor-pointer group"
                            onClick={() => setCurrentView("kanban")}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                  isCritical ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                                }`}>
                                  {isCritical ? "HIGH RISK" : "ROUTINE"}
                                </span>
                                <span className="text-[10px] text-white/40 uppercase font-mono">{task.category}</span>
                              </div>
                              <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                                {task.title}
                              </h4>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className="text-[10px] text-white/40 font-mono">{task.durationMinutes}m duration</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateStatus(task.id, "COMPLETED");
                                }}
                                className="w-7 h-7 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/20 transition-all cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {activeTasks.length === 0 && (
                        <div className="py-8 border border-dashed border-white/5 rounded-xl text-center text-white/30 italic text-xs">
                          All tasks cleared! Take a breather.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Heatmap Grid */}
                  <div className="bg-black/30 border border-white/5 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-white">Commitment Velocity Map</h2>
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">16-Week Heat Tracker</span>
                    </div>

                    <div className="grid grid-cols-16 gap-1 overflow-x-auto py-1">
                      {activityLogs.slice(0, 112).map((log, idx) => {
                        const intensity = log.count >= 5 ? "bg-indigo-500" : log.count >= 3 ? "bg-indigo-700" : log.count >= 1 ? "bg-indigo-900" : "bg-white/5";
                        return (
                          <div
                            key={idx}
                            className={`aspect-square rounded-[2px] transition-all cursor-pointer hover:scale-125 ${intensity}`}
                            title={`${log.date}: ${log.count} achievements completed`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-end gap-1.5 items-center mt-2.5 text-[9px] text-white/40 uppercase tracking-widest font-semibold">
                      <span>Less</span>
                      <div className="w-2.5 h-2.5 bg-white/5 rounded-[1px]" />
                      <div className="w-2.5 h-2.5 bg-indigo-900 rounded-[1px]" />
                      <div className="w-2.5 h-2.5 bg-indigo-700 rounded-[1px]" />
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-[1px]" />
                      <span>More</span>
                    </div>
                  </div>

                </div>

                {/* Right Column: Mini Pomodoro & Fast Chat helper */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Focus Timer mini teaser */}
                  <div className="bg-indigo-600 rounded-2xl p-5 shadow-lg shadow-indigo-500/20 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6" />
                    <div>
                      <h3 className="font-extrabold text-sm text-white">Focus Block Active</h3>
                      <p className="text-[11px] text-indigo-100/70">Pomodoro: 25:00 active interval</p>
                    </div>
                    <button
                      onClick={() => setCurrentView("focus")}
                      className="w-9 h-9 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow hover:scale-105 transition-all"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  </div>

                  {/* Interactive Fast Chat assistant */}
                  <div className="bg-black/30 border border-white/5 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Fast Coaching</span>
                      <span className="text-[10px] text-indigo-400 font-mono">v2.4 Live</span>
                    </div>

                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                      <p className="text-xs text-white/80 font-medium">"I noticed you have a gap between 2:30 PM and 3:45 PM. I recommend starting the Pitch Deck draft now to avoid the 6 PM crunch."</p>
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => {
                          setCurrentView("chat");
                          handleSendMessage("I have 3 hours, what should I finish?");
                        }}
                        className="text-[10px] px-2.5 py-1 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 text-white/70"
                      >
                        "I have 3 hours..."
                      </button>
                      <button
                        onClick={() => {
                          setCurrentView("chat");
                          handleSendMessage("Plan my weekend.");
                        }}
                        className="text-[10px] px-2.5 py-1 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 text-white/70"
                      >
                        "Plan my weekend"
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {currentView === "kanban" && (
            <KanbanBoard
              tasks={tasks}
              onUpdateStatus={handleUpdateStatus}
              onDeleteTask={handleDeleteTask}
              onToggleSubtask={handleToggleSubtask}
              onAddTaskClick={() => {
                setNewTaskDate(new Date().toISOString().split("T")[0]);
                setIsAddTaskOpen(true);
              }}
            />
          )}

          {currentView === "calendar" && (
            <CalendarView
              tasks={tasks}
              onAddTaskClick={(dateStr) => {
                setNewTaskDate(dateStr);
                setIsAddTaskOpen(true);
              }}
              googleToken={googleToken}
              onUpdateTask={async (updatedTask) => {
                setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
                if (currentUser) {
                  await saveUserTask(currentUser.uid, updatedTask);
                }
              }}
            />
          )}

          {currentView === "focus" && (
            <div className="max-w-3xl mx-auto">
              <FocusTimer onCompleteTask={() => triggerActivityLogToday()} />
            </div>
          )}

          {currentView === "ai-suite" && (
            <div className="max-w-4xl mx-auto">
              <AICommandCenter
                tasks={tasks}
                onAddTasksFromActionItems={handleAddTasksFromActionItems}
              />
            </div>
          )}

          {currentView === "goals" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Habits list */}
              <div className="bg-black/30 border border-[#1a1a1a] p-5 rounded-2xl flex flex-col gap-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-white">Daily Consistency Loops</h2>
                  </div>
                  <button
                    onClick={() => {
                      setHabitFormOpen(!habitFormOpen);
                      setNewHabitTitle("");
                    }}
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Loop
                  </button>
                </div>

                {habitFormOpen && (
                  <div className="p-3 bg-[#0a0a0c] border border-indigo-500/30 rounded-xl space-y-3">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">New Consistency Loop</label>
                      <input
                        type="text"
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        placeholder="e.g. Read 15 mins, Drink water, Gym"
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-white"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setHabitFormOpen(false);
                          setNewHabitTitle("");
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg text-[10px]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (newHabitTitle.trim()) {
                            handleAddHabit(newHabitTitle.trim(), newHabitCategory);
                            setNewHabitTitle("");
                            setHabitFormOpen(false);
                          }
                        }}
                        disabled={!newHabitTitle.trim()}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold disabled:opacity-50"
                      >
                        Add Loop
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {habits
                    .filter(habit => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      return !habit.completedDays.includes(todayStr);
                    })
                    .map(habit => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const isCompleted = habit.completedDays.includes(todayStr);

                    return (
                      <div key={habit.id} className="p-3.5 bg-[#0a0a0c] border border-white/5 rounded-xl flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white">{habit.title}</h4>
                          <span className="text-[10px] text-indigo-400 font-bold">{habit.streak} day streak</span>
                        </div>
                        <button
                          onClick={() => handleToggleHabitToday(habit.id)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                            isCompleted
                              ? "bg-green-500/15 border-green-500/35 text-green-400"
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* High-level Goals and milestones */}
              <div className="bg-black/30 border border-[#1a1a1a] p-5 rounded-2xl flex flex-col gap-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-white">Milestone Anchors</h2>
                  </div>
                  <button
                    onClick={() => {
                      setGoalFormOpen(!goalFormOpen);
                      setNewGoalTitle("");
                      setNewGoalMilestonesText("");
                    }}
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Goal
                  </button>
                </div>

                {goalFormOpen && (
                  <div className="p-3 bg-[#0a0a0c] border border-purple-500/30 rounded-xl space-y-3">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">Goal / Milestone Anchor Title</label>
                      <input
                        type="text"
                        value={newGoalTitle}
                        onChange={(e) => setNewGoalTitle(e.target.value)}
                        placeholder="e.g. Launch Beta Product"
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-white"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">Milestones (comma-separated)</label>
                      <input
                        type="text"
                        value={newGoalMilestonesText}
                        onChange={(e) => setNewGoalMilestonesText(e.target.value)}
                        placeholder="e.g. Complete architecture, Deploy beta, Setup DNS"
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setGoalFormOpen(false);
                          setNewGoalTitle("");
                          setNewGoalMilestonesText("");
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg text-[10px]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (newGoalTitle.trim()) {
                            const milestones = newGoalMilestonesText
                              ? newGoalMilestonesText.split(",").map(m => m.trim()).filter(m => m.length > 0)
                              : ["Complete architecture", "Deploy beta version"];
                            handleAddGoal(newGoalTitle.trim(), newGoalCategory, milestones);
                            setNewGoalTitle("");
                            setNewGoalMilestonesText("");
                            setGoalFormOpen(false);
                          }
                        }}
                        disabled={!newGoalTitle.trim()}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold disabled:opacity-50"
                      >
                        Add Goal
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {goals
                    .filter(goal => goal.progress < 100)
                    .map(goal => (
                    <div key={goal.id} className="p-4 bg-[#0a0a0c] border border-white/5 rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-black text-white">{goal.title}</h4>
                          <span className="text-[10px] text-white/40">Category: {goal.category}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                          {goal.progress}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all" style={{ width: `${goal.progress}%` }} />
                      </div>

                      {/* Milestones toggler */}
                      <div className="space-y-1.5 pt-1">
                        {goal.milestones.map(m => (
                          <div
                            key={m.id}
                            onClick={() => handleToggleMilestone(goal.id, m.id)}
                            className="flex items-center gap-2 text-[11px] text-white/60 hover:text-white cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={m.completed}
                              readOnly
                              className="rounded border-white/20 text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className={m.completed ? "line-through text-white/30" : ""}>{m.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentView === "chat" && (
            <div className="w-full glass-card rounded-2xl border border-white/5 flex h-[620px] overflow-hidden">
              {/* GPT-style Left Sidebar */}
              <div className="w-64 border-r border-white/5 bg-[#070709] flex flex-col h-full flex-shrink-0">
                {/* New Chat Button */}
                <div className="p-3 border-b border-white/5">
                  <button
                    onClick={handleNewChat}
                    className="w-full py-2.5 px-4 bg-[#0d0d10] hover:bg-[#131317] border border-white/10 hover:border-indigo-500/50 rounded-xl text-xs font-bold text-indigo-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    New Chat
                  </button>
                </div>

                {/* Saved Chat Sessions List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  <div className="px-2 py-1.5 text-[9px] uppercase tracking-widest font-black text-white/30">
                    Previous Sessions
                  </div>
                  {chatSessions.map((session) => {
                    const isActive = session.id === activeSession.id;
                    return (
                      <div
                        key={session.id}
                        onClick={() => setActiveSessionId(session.id)}
                        className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                          isActive
                            ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-200"
                            : "bg-transparent border-transparent text-white/50 hover:bg-white/5 hover:text-white/90"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-indigo-400" : "text-white/30"}`} />
                          <span className="truncate pr-1 font-medium">{session.title}</span>
                        </div>
                        
                        {/* Delete Session Button */}
                        <button
                          onClick={(e) => handleDeleteChat(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all flex-shrink-0 cursor-pointer"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-white/5 bg-[#0a0a0c] flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] text-white/70 truncate font-semibold">{userName}</span>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                </div>
              </div>

              {/* Right ChatGPT-style Panel */}
              <div className="flex-1 flex flex-col bg-transparent h-full overflow-hidden">
                {/* Panel Header */}
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0a0a0c]/40">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      {activeSession.title || "Chief of Staff Assistant"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-white/30 font-mono hidden sm:inline">Autopilot Sync Connected</span>
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] uppercase font-bold rounded border border-indigo-500/20">
                      GPT Co-Pilot
                    </span>
                  </div>
                </div>

                {/* Chats / Messages View */}
                <div className="flex-1 p-6 overflow-y-auto space-y-5 custom-scrollbar">
                  {activeSession.messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.sender !== "user" && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-black flex-shrink-0 shadow-md">
                          AI
                        </div>
                      )}
                      <div className="space-y-2 max-w-[80%]">
                        <div className={`p-4 text-xs leading-relaxed rounded-2xl shadow-sm border ${
                          msg.sender === "user"
                            ? "bg-indigo-600 border-indigo-500/30 text-white rounded-tr-none"
                            : "bg-[#0b0b0e] border-white/5 text-white/90 rounded-tl-none"
                        }`}>
                          {msg.sender === "user" ? (
                            <span className="whitespace-pre-line">{msg.text}</span>
                          ) : (
                            <div className="markdown-body">
                              <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>
                          )}
                        </div>

                        {/* Suggested Prompts */}
                        {msg.suggestedPrompts && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {msg.suggestedPrompts.map((prompt, pIdx) => (
                              <button
                                key={pIdx}
                                onClick={() => handleSendMessage(prompt)}
                                className="text-[10px] text-indigo-300 hover:text-white bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/15 py-1 px-2.5 rounded-lg text-left transition-all cursor-pointer"
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        )}
                        <span className="text-[9px] text-white/30 block px-1 text-right">
                          {msg.timestamp}
                        </span>
                      </div>
                      {msg.sender === "user" && (
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/80 text-[11px] font-bold flex-shrink-0 border border-white/10">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-3 items-center text-xs text-white/40 bg-white/5 p-4 rounded-xl border border-white/5 w-fit">
                      <span className="w-4 h-4 border-2 border-white/20 border-t-indigo-500 rounded-full animate-spin" />
                      Priora Chief of Staff is calculating strategic scheduling solutions...
                    </div>
                  )}
                </div>

                {/* ChatGPT-style Centered Bottom Input Area */}
                <div className="p-4 border-t border-white/5 bg-[#070709]/60 backdrop-blur-md">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="max-w-3xl mx-auto flex items-center gap-2 bg-[#0c0c0e] border border-white/10 focus-within:border-indigo-500/50 rounded-2xl p-1.5 transition-all shadow-lg"
                  >
                    {/* Voice Control Inside the Chat Input */}
                    <button
                      type="button"
                      onClick={triggerVoiceCommand}
                      className={`p-2.5 rounded-xl transition-all flex items-center justify-center flex-shrink-0 cursor-pointer border ${
                        isListening
                          ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse"
                          : "bg-white/5 hover:bg-white/10 border-white/5 text-white/60 hover:text-white"
                      }`}
                      title="Voice Command Control"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask Priora... e.g. I have 2 hours, what should I finish?"
                      className="flex-1 bg-transparent border-0 px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-0"
                    />

                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </form>
                  <p className="text-[9px] text-white/20 text-center mt-2">
                    Priora can make mistakes. Consider checking important strategic plan details.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentView === "settings" && (
            <div className="max-w-2xl mx-auto glass-card rounded-2xl border border-white/5 p-6 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-white/5 pb-2">priora preferences</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Owner Identity</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Identity Profile</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs bg-[#050505]"
                  >
                    <option value="Student">Student</option>
                    <option value="Professional">Professional</option>
                    <option value="Founder">Founder</option>
                    <option value="General">General Coordinator</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Cloud Database Connectivity</label>
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                    <div className={`w-2 h-2 rounded-full ${
                      dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' :
                      dbStatus === 'checking' ? 'bg-amber-500 animate-pulse' :
                      'bg-red-500 shadow-[0_0_8px_#ef4444]'
                    }`} />
                    <div className="flex flex-col">
                      <span className="text-xs text-white/80 font-mono capitalize">
                        {dbStatus === 'connected' ? 'Connected (Firestore Secure)' :
                         dbStatus === 'checking' ? 'Establishing Cloud Sync...' : 'Database Sync Error'}
                      </span>
                      {dbStatus === 'error' && (
                        <span className="text-[9px] text-red-400 block mt-0.5 font-mono leading-tight">
                          Error Details: {dbErrorDetails}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-4">
                  <button
                    onClick={async () => {
                      if (currentUser) {
                        await saveUserProfile(currentUser.uid, { name: userName, role: userRole });
                        alert("Preferences successfully saved to Cloud Firestore!");
                      }
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Save Preferences
                  </button>
                  <button
                    onClick={async () => {
                      await logout();
                      setCurrentUser(null);
                      setGoogleToken(null);
                      setTasks([]);
                      setHabits([]);
                      setGoals([]);
                      setActivityLogs([]);
                      setChatSessions([]);
                    }}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/10 transition-all cursor-pointer"
                  >
                    Logout
                  </button>
                  <button
                    onClick={() => {
                      localStorage.clear();
                      setIsOnboarded(false);
                    }}
                    className="px-4 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl text-xs font-semibold border border-red-500/20 transition-all cursor-pointer ml-auto"
                  >
                    Reset Onboarding
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Footer status board */}
      <footer className="h-8 border-t border-[#1a1a1a] bg-[#050505] px-6 flex items-center justify-between text-[10px] text-white/30">
        <div className="flex items-center gap-4">
          <span>Session Sync: <span className="text-green-500/70">Encrypted</span></span>
          <span className="hidden sm:inline">Telemetry Loop: <span className="text-white/60">4ms stable</span></span>
          <span>Database: <span className={
            dbStatus === "connected" ? "text-emerald-400 font-bold" :
            dbStatus === "checking" ? "text-amber-400 animate-pulse" :
            "text-red-400 font-bold"
          }>
            {dbStatus === "connected" ? "● Connected" :
             dbStatus === "checking" ? "● Syncing" :
             "● Error"}
          </span></span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
            Model: Gemini-3.5-Flash
          </span>
          <span className="text-white/40 uppercase font-bold tracking-wider">Enterprise COS v1.0</span>
        </div>
      </footer>

      {/* ADD TASK MODAL DIALOG */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
            <div className="p-5 border-b border-white/5 bg-[#0a0a0c] flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Schedule New Task</h3>
              <button
                onClick={() => setIsAddTaskOpen(false)}
                className="text-white/40 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[480px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">Task Title</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g. Refactor API schema definitions"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">Details & Context</label>
                  <textarea
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Include key files, constraints or context"
                    className="w-full h-14 glass-input rounded-xl p-3 text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">Category</label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs bg-[#0c0c0e]"
                  >
                    <option value="Work">Work</option>
                    <option value="Study">Study</option>
                    <option value="Personal">Personal</option>
                    <option value="Finance">Finance</option>
                    <option value="Health">Health</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">Urgency (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newTaskUrgency}
                    onChange={(e) => setNewTaskUrgency(Number(e.target.value))}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Generate subtasks with AI */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={generateSubtasks}
                  disabled={isGeneratingSubtasks || !newTaskTitle.trim()}
                  className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg text-[10px] font-bold border border-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingSubtasks ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Brainstorm Subtasks using AI
                </button>

                {suggestedSubtasks.length > 0 && (
                  <div className="mt-2.5 p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5 max-h-32 overflow-y-auto">
                    <span className="text-[9px] uppercase font-bold text-indigo-400">Autogenerated Subtask breakdown</span>
                    {suggestedSubtasks.map((st, i) => (
                      <div key={i} className="text-[10px] text-white/70">• {st}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-[#0a0a0c] flex justify-end gap-2.5">
              <button
                onClick={() => setIsAddTaskOpen(false)}
                className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
