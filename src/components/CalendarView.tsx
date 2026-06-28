import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, Sparkles, Plus, Check } from "lucide-react";
import { Task } from "../types";
import { listGoogleCalendarEvents, createGoogleCalendarEvent } from "../lib/googleCalendar";

export default function CalendarView({
  tasks,
  onAddTaskClick,
  googleToken,
  onUpdateTask
}: {
  tasks: Task[];
  onAddTaskClick?: (dateStr: string) => void;
  googleToken?: string | null;
  onUpdateTask?: (task: Task) => Promise<void>;
}) {
  const [viewType, setViewType] = useState<"month" | "week" | "day">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [googleSynced, setGoogleSynced] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);

  // Load Google Calendar events if we have a token
  useEffect(() => {
    if (googleToken) {
      setSyncLoading(true);
      listGoogleCalendarEvents(googleToken)
        .then(events => {
          setGoogleEvents(events);
          setGoogleSynced(true);
        })
        .catch(err => {
          console.error("Failed to load Google Calendar events", err);
        })
        .finally(() => {
          setSyncLoading(false);
        });
    }
  }, [googleToken]);

  const handleGoogleSync = async () => {
    if (!googleToken) {
      alert("Please authenticate using 'Sign In with Google' first to enable Google Calendar synchronization!");
      return;
    }
    setSyncLoading(true);
    try {
      // Find tasks that haven't been synced to Google Calendar yet
      const unsynced = tasks.filter(t => !t.googleCalendarEventId);
      if (unsynced.length === 0) {
        // Refresh events list
        const events = await listGoogleCalendarEvents(googleToken);
        setGoogleEvents(events);
        setGoogleSynced(true);
        return;
      }

      for (const t of unsynced) {
        const eventId = await createGoogleCalendarEvent(googleToken, t);
        if (eventId && onUpdateTask) {
          await onUpdateTask({ ...t, googleCalendarEventId: eventId });
        }
      }

      const events = await listGoogleCalendarEvents(googleToken);
      setGoogleEvents(events);
      setGoogleSynced(true);
    } catch (err) {
      console.error("Google Calendar Sync failed:", err);
      alert("Could not complete calendar sync. Check your OAuth setup or project permissions.");
    } finally {
      setSyncLoading(false);
    }
  };

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Map tasks to days
  const getTasksForDay = (day: number) => {
    return tasks.filter(t => {
      const dueDate = new Date(t.dueDate);
      return dueDate.getDate() === day && dueDate.getMonth() === month && dueDate.getFullYear() === year;
    });
  };

  return (
    <div id="calendar-widget-root" className="glass-card rounded-2xl border border-white/5 overflow-hidden flex flex-col h-full min-h-[500px]">
      {/* Calendar Header Controls */}
      <div className="p-4 md:p-5 border-b border-white/5 bg-[#0a0a0a]/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Adaptive Scheduler</h2>
          <button
            onClick={handleGoogleSync}
            disabled={syncLoading}
            className={`text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-all ${
              googleSynced
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/20 cursor-pointer"
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${googleSynced ? "bg-green-400" : "bg-indigo-400 animate-pulse"}`} />
            {syncLoading ? "Syncing API..." : googleSynced ? "Google Calendar Connected" : "Sync Google Calendar"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggles */}
          <div className="bg-white/5 p-1 rounded-lg border border-white/10 flex">
            {["month", "week", "day"].map(type => (
              <button
                key={type}
                onClick={() => setViewType(type as any)}
                className={`text-[10px] uppercase font-bold px-3 py-1 rounded-md transition-all ${
                  viewType === type
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/10 p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-white/5 text-white/60 hover:text-white rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-white px-2 min-w-[100px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-white/5 text-white/60 hover:text-white rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid rendering based on View Type */}
      <div className="flex-1 p-4 overflow-y-auto">
        {viewType === "month" && (
          <div className="h-full flex flex-col gap-1">
            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-[10px] font-bold text-white/40 uppercase tracking-widest py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-[360px]">
              {/* Empty padding leading up to first day */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`empty-${idx}`} className="bg-white/[0.01] rounded-lg border border-transparent min-h-[60px]" />
              ))}

              {/* Day slots */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dayTasks = getTasksForDay(dayNum);
                const isToday = new Date().getDate() === dayNum && new Date().getMonth() === month && new Date().getFullYear() === year;

                const dateString = `${year}-${(month + 1).toString().padStart(2, "0")}-${dayNum.toString().padStart(2, "0")}`;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => onAddTaskClick && onAddTaskClick(dateString)}
                    className={`bg-black/30 border rounded-lg p-1.5 min-h-[75px] flex flex-col justify-between hover:border-indigo-500/30 transition-all cursor-pointer group ${
                      isToday ? "border-indigo-500/40 bg-indigo-500/[0.02]" : "border-white/5"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-bold ${isToday ? "text-indigo-400 font-mono" : "text-white/60"}`}>
                        {dayNum}
                      </span>
                      <Plus className="w-3 h-3 text-white/0 group-hover:text-white/40 transition-colors" />
                    </div>

                    <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[55px] custom-scrollbar">
                      {dayTasks.map(task => (
                        <div
                          key={task.id}
                          className={`text-[9px] px-1.5 py-0.5 rounded border truncate flex items-center justify-between ${
                            task.status === "COMPLETED"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : task.riskScore > 75
                              ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse"
                              : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                          }`}
                          title={task.title}
                        >
                          <span className="truncate">{task.title}</span>
                          {task.status === "COMPLETED" && <Check className="w-2.5 h-2.5 flex-shrink-0 ml-1" />}
                        </div>
                      ))}
                      
                      {googleEvents.filter(event => {
                        const startStr = event.start?.dateTime || event.start?.date;
                        if (!startStr) return false;
                        const startDate = new Date(startStr);
                        return startDate.getDate() === dayNum && startDate.getMonth() === month && startDate.getFullYear() === year;
                      }).map((event, idx) => (
                        <div
                          key={`g-event-${idx}`}
                          className="text-[9px] px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-300 border-amber-500/20 truncate flex items-center gap-1"
                          title={event.summary}
                        >
                          <div className="w-1 h-1 rounded-full bg-amber-400" />
                          <span className="truncate">{event.summary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewType === "week" && (
          <div className="space-y-3">
            <p className="text-[11px] text-white/40 italic">Weekly timeline view mapped against hourly availability blocks.</p>
            <div className="space-y-2">
              {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                const dayDate = new Date(currentDate);
                dayDate.setDate(dayDate.getDate() - dayDate.getDay() + offset);
                const dayTasks = tasks.filter(t => {
                  const dDate = new Date(t.dueDate);
                  return dDate.getDate() === dayDate.getDate() && dDate.getMonth() === dayDate.getMonth() && dDate.getFullYear() === dayDate.getFullYear();
                });

                const dayGoogleEvents = googleEvents.filter(event => {
                  const startStr = event.start?.dateTime || event.start?.date;
                  if (!startStr) return false;
                  const startDate = new Date(startStr);
                  return startDate.getDate() === dayDate.getDate() && startDate.getMonth() === dayDate.getMonth() && startDate.getFullYear() === dayDate.getFullYear();
                });

                return (
                  <div key={offset} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex gap-4 items-center">
                    <div className="w-14 text-right">
                      <div className="text-xs font-bold text-indigo-400 font-mono">
                        {dayDate.toLocaleDateString([], { weekday: 'short' })}
                      </div>
                      <div className="text-xs font-black text-white">{dayDate.getDate()}</div>
                    </div>

                    <div className="flex-1 flex gap-2 flex-wrap min-h-[30px] items-center pl-4 border-l border-white/10">
                      {dayTasks.length === 0 && dayGoogleEvents.length === 0 ? (
                        <span className="text-[10px] text-white/20 italic">No scheduled task commitments.</span>
                      ) : (
                        <>
                          {dayTasks.map(t => (
                            <span
                              key={t.id}
                              className={`text-[10px] px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
                                t.status === "COMPLETED"
                                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                                  : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                              }`}
                            >
                              <span className="font-semibold">{t.title}</span>
                              <span className="text-[8px] text-white/40">({t.category})</span>
                            </span>
                          ))}
                          {dayGoogleEvents.map((event, idx) => (
                            <span
                              key={`g-event-wk-${idx}`}
                              className="text-[10px] px-2 py-1 rounded-lg border bg-amber-500/10 text-amber-300 border-amber-500/20 flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span className="font-semibold">{event.summary}</span>
                              <span className="text-[8px] text-amber-400/60">(Google)</span>
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewType === "day" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white/60">Hourly Schedule Details</span>
              <span className="text-[10px] text-white/30 font-mono">UTC Offset: Live</span>
            </div>
            <div className="space-y-2 border-l border-white/15 pl-4 ml-2">
              {[
                { hour: "08:00 AM", task: "Planning Reset & Synced Coffee", type: "system" },
                { hour: "10:00 AM", task: tasks.find(t => t.status !== "COMPLETED")?.title || "Inbox Sweep", type: "task" },
                { hour: "12:00 PM", task: "Productivity Break: Deep Breathing Reset", type: "system" },
                { hour: "03:00 PM", task: "AI Engine Outbound Reminders Sync", type: "system" },
                { hour: "06:00 PM", task: "Audit Dashboard Achievements", type: "system" }
              ].map((slot, idx) => (
                <div key={idx} className="relative py-2">
                  <div className="absolute -left-[21px] top-4 w-2 h-2 rounded-full bg-indigo-500" />
                  <div className="text-[10px] text-indigo-400 font-mono font-bold">{slot.hour}</div>
                  <div className="text-xs font-semibold text-white/80 mt-0.5">{slot.task}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
