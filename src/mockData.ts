import { Task, Habit, Goal, ActivityLog } from "./types";

// Get date relative to today
export function getRelativeDate(daysOffset: number, hoursOffset: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(date.getHours() + hoursOffset);
  return date.toISOString();
}

export const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "AI Hackathon Final Pitch Deck",
    description: "Design slides, structure user-journey graphics, and finalize value propositions. Imminent deadline!",
    urgency: 9,
    importance: 10,
    effort: 7,
    durationMinutes: 90,
    dueDate: getRelativeDate(0, 4), // 4 hours from now
    category: "Work",
    status: "IN_PROGRESS",
    riskScore: 88,
    dependencies: [],
    subtasks: [
      { id: "sub-1-1", title: "Refine problem slide typography", completed: true },
      { id: "sub-1-2", title: "Add high-fidelity screenshots", completed: false },
      { id: "sub-1-3", title: "Draft speaker notes", completed: false }
    ]
  },
  {
    id: "task-2",
    title: "Syllabus Review: Machine Learning Exam",
    description: "Deconstruct remaining modules, summarize neural net structures, and run practice exam questions.",
    urgency: 8,
    importance: 9,
    effort: 8,
    durationMinutes: 120,
    dueDate: getRelativeDate(1, 2), // 26 hours from now
    category: "Study",
    status: "TODO",
    riskScore: 72,
    dependencies: [],
    subtasks: [
      { id: "sub-2-1", title: "Review backpropagation derivations", completed: false },
      { id: "sub-2-2", title: "Complete practice problem set 4", completed: false },
      { id: "sub-2-3", title: "Summarize CNN architecture parameters", completed: false }
    ]
  },
  {
    id: "task-3",
    title: "Client Deliverable: Database Schema Rewrite",
    description: "Optimize PostgreSQL connection parameters and index slow queries in production.",
    urgency: 5,
    importance: 8,
    effort: 6,
    durationMinutes: 180,
    dueDate: getRelativeDate(3), // 3 days from now
    category: "Work",
    status: "TODO",
    riskScore: 35,
    dependencies: [],
    subtasks: [
      { id: "sub-3-1", title: "Run EXPLAIN ANALYZE on query 14", completed: false },
      { id: "sub-3-2", title: "Create composite index on user_id_timestamp", completed: false }
    ]
  },
  {
    id: "task-4",
    title: "Quarterly Financial Budget Audit",
    description: "Verify server host bills, SaaS subscriptions, and calculate marketing CAC/LTV multipliers.",
    urgency: 4,
    importance: 7,
    effort: 5,
    durationMinutes: 60,
    dueDate: getRelativeDate(5), // 5 days from now
    category: "Finance",
    status: "TODO",
    riskScore: 18,
    dependencies: [],
    subtasks: []
  },
  {
    id: "task-5",
    title: "Publish Technical Blog Post",
    description: "Write-up on utilizing esbuild and tsx for zero-config full-stack Node.js environments.",
    urgency: 3,
    importance: 5,
    effort: 4,
    durationMinutes: 90,
    dueDate: getRelativeDate(7), // 7 days from now
    category: "Personal",
    status: "TODO",
    riskScore: 10,
    dependencies: [],
    subtasks: []
  },
  {
    id: "task-6",
    title: "Initialize GitHub Repository Template",
    description: "Setup basic Vite project, configure standard dependencies and eslint configurations.",
    urgency: 10,
    importance: 8,
    effort: 3,
    durationMinutes: 30,
    dueDate: getRelativeDate(-1), // Completed yesterday
    category: "Work",
    status: "COMPLETED",
    completedAt: getRelativeDate(-1, -4),
    riskScore: 0,
    dependencies: [],
    subtasks: [
      { id: "sub-6-1", title: "Install react-router-dom", completed: true },
      { id: "sub-6-2", title: "Configure standard aliases", completed: true }
    ]
  },
  {
    id: "task-7",
    title: "Weekly Clean & Laundry Recharge",
    description: "Tidy work desk, clean laundry, organize clothes, and recharge workspace atmosphere.",
    urgency: 2,
    importance: 4,
    effort: 2,
    durationMinutes: 45,
    dueDate: getRelativeDate(-1, -8), // Completed yesterday
    category: "Personal",
    status: "COMPLETED",
    completedAt: getRelativeDate(-1, -7),
    riskScore: 0,
    dependencies: [],
    subtasks: []
  }
];

export const initialHabits: Habit[] = [
  {
    id: "habit-1",
    title: "Morning Planning Sync",
    frequency: "daily",
    streak: 8,
    completedDays: [
      getRelativeDate(0).split("T")[0],
      getRelativeDate(-1).split("T")[0],
      getRelativeDate(-2).split("T")[0],
      getRelativeDate(-3).split("T")[0],
      getRelativeDate(-4).split("T")[0]
    ],
    category: "Work"
  },
  {
    id: "habit-2",
    title: "10-Min Breathing Reset",
    frequency: "daily",
    streak: 5,
    completedDays: [
      getRelativeDate(-1).split("T")[0],
      getRelativeDate(-2).split("T")[0],
      getRelativeDate(-3).split("T")[0]
    ],
    category: "Health"
  },
  {
    id: "habit-3",
    title: "Read Technical Docs",
    frequency: "daily",
    streak: 12,
    completedDays: [
      getRelativeDate(0).split("T")[0],
      getRelativeDate(-1).split("T")[0],
      getRelativeDate(-2).split("T")[0]
    ],
    category: "Study"
  },
  {
    id: "habit-4",
    title: "Weekly Retrospective Review",
    frequency: "weekly",
    streak: 3,
    completedDays: [
      getRelativeDate(-5).split("T")[0]
    ],
    category: "Personal"
  }
];

export const initialGoals: Goal[] = [
  {
    id: "goal-1",
    title: "Succeed in AI Hackathon",
    targetDate: getRelativeDate(2),
    category: "Work",
    milestones: [
      { id: "m-1", title: "Initialize clean repo structure", completed: true },
      { id: "m-2", title: "Draft full-stack endpoints & models", completed: true },
      { id: "m-3", title: "Deploy responsive client application", completed: false }
    ],
    progress: 66
  },
  {
    id: "goal-2",
    title: "A+ in Machine Learning Course",
    targetDate: getRelativeDate(20),
    category: "Study",
    milestones: [
      { id: "m-2-1", title: "Submit all lab assignments", completed: true },
      { id: "m-2-2", title: "Score > 90% on midterm", completed: true },
      { id: "m-2-3", title: "Review comprehensive exam syllabus", completed: false },
      { id: "m-2-4", title: "Pass final examination with high marks", completed: false }
    ],
    progress: 50
  }
];

// Generates activity data for a 16-week grid (GitHub heatmap style)
export function generateActivityLogs(): ActivityLog[] {
  const logs: ActivityLog[] = [];
  const today = new Date();
  
  for (let i = 112; i >= 0; i--) { // 16 weeks * 7 days = 112 days
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    
    // Seed with beautiful varied mock numbers (more active on weekdays)
    const dayOfWeek = d.getDay();
    let count = 0;
    
    // Create organic looking heat spots
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      count = Math.random() > 0.6 ? Math.floor(Math.random() * 3) : 0;
    } else {
      count = Math.floor(Math.random() * 6);
      if (Math.random() > 0.8) count += 2; // high density spots
    }
    
    logs.push({ date: dateStr, count });
  }
  return logs;
}
