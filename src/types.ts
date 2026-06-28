export interface Task {
  id: string;
  title: string;
  description?: string;
  urgency: number; // 1-10
  importance: number; // 1-10
  effort: number; // 1-10 (1 = low, 10 = high)
  durationMinutes: number;
  dueDate: string; // ISO date string
  category: string; // "Work" | "Study" | "Personal" | "Finance" | "Health" | string
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  completedAt?: string;
  riskScore: number; // 0 - 100 predicted risk of missing deadline
  dependencies: string[]; // task IDs
  subtasks: Subtask[];
  googleCalendarEventId?: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Habit {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  completedDays: string[]; // Dates like "2026-06-27"
  category: string;
}

export interface Goal {
  id: string;
  title: string;
  targetDate: string;
  category: string;
  milestones: { id: string; title: string; completed: boolean }[];
  progress: number; // percentage
}

export interface TriageResult {
  triage: {
    urgency_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    estimated_total_time_minutes: number;
    psychological_grounding_message: string;
  };
  ui_orchestration: {
    ui_mode: 'PANIC_MODE' | 'FOCUS_EDITOR' | 'STANDARD_DASHBOARD' | 'SCHEDULER';
    suggested_theme_color: string;
  };
  action_plan: {
    step_number: number;
    title: string;
    duration_minutes: number;
    is_autonomous_assist_available: boolean;
    ai_generated_artifact: string | null;
  }[];
  calendar_integration: {
    suggested_block_start: string;
    requires_cancellation_of_other_events: boolean;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedPrompts?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

export interface ActivityLog {
  date: string; // YYYY-MM-DD
  count: number; // number of completed tasks/habits
}
