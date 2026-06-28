import React, { useState } from "react";
import { Plus, Search, Filter, CheckSquare, Clock, AlertTriangle, ArrowRight, Check, Trash2, ShieldAlert } from "lucide-react";
import { Task } from "../types";

export default function KanbanBoard({
  tasks,
  onUpdateStatus,
  onDeleteTask,
  onToggleSubtask,
  onAddTaskClick
}: {
  tasks: Task[];
  onUpdateStatus: (id: string, newStatus: Task["status"]) => void;
  onDeleteTask: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddTaskClick: () => void;
}) {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [draggingOverCol, setDraggingOverCol] = useState<string | null>(null);

  const categories = ["ALL", "Work", "Study", "Personal", "Finance", "Health"];

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (task.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "ALL" || task.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const columns: { id: Task["status"]; label: string; colorClass: string }[] = [
    { id: "TODO", label: "Priora Backlog", colorClass: "border-indigo-500/20 text-indigo-400" },
    { id: "IN_PROGRESS", label: "Active Cycles", colorClass: "border-yellow-500/20 text-yellow-400" },
    { id: "REVIEW", label: "Compliance Review", colorClass: "border-purple-500/20 text-purple-400" },
    { id: "COMPLETED", label: "Completed Gates", colorClass: "border-green-500/20 text-green-400" }
  ];

  const getUrgencyBadge = (score: number) => {
    if (score >= 8) return { label: "CRITICAL", class: "bg-red-500/15 text-red-400 border-red-500/20" };
    if (score >= 5) return { label: "HIGH", class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" };
    return { label: "ROUTINE", class: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20" };
  };

  const shiftStatus = (task: Task) => {
    const sequence: Task["status"][] = ["TODO", "IN_PROGRESS", "REVIEW", "COMPLETED"];
    const currentIndex = sequence.indexOf(task.status);
    if (currentIndex < sequence.length - 1) {
      onUpdateStatus(task.id, sequence[currentIndex + 1]);
    }
  };

  return (
    <div id="kanban-board-widget" className="space-y-4">
      {/* Control Ribbon */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search active tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-white/40" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="glass-input rounded-xl px-2.5 py-1.5 text-xs bg-[#050505] cursor-pointer"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex">
            <button
              onClick={() => setViewMode("kanban")}
              className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "kanban" ? "bg-indigo-600 text-white shadow-md" : "text-white/40 hover:text-white"
              }`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "list" ? "bg-indigo-600 text-white shadow-md" : "text-white/40 hover:text-white"
              }`}
            >
              Compact List
            </button>
          </div>

          <button
            onClick={onAddTaskClick}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Grid rendering based on mode */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggingOverCol !== col.id) {
                    setDraggingOverCol(col.id);
                  }
                }}
                onDragLeave={() => {
                  setDraggingOverCol(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggingOverCol(null);
                  const taskId = e.dataTransfer.getData("text/plain");
                  if (taskId) {
                    onUpdateStatus(taskId, col.id);
                  }
                }}
                className={`flex flex-col rounded-2xl p-4 min-h-[400px] transition-all duration-200 ${
                  draggingOverCol === col.id
                    ? "bg-indigo-950/20 border-2 border-dashed border-indigo-500/60 scale-[1.01]"
                    : "bg-black/40 border border-white/5"
                }`}
              >
                <div className={`pb-2.5 mb-4 border-b border-white/5 flex justify-between items-center ${col.colorClass}`}>
                  <span className="text-xs font-black uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs font-mono font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/10 text-white/50">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
                  {colTasks.length === 0 ? (
                    <div className="h-28 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center text-center text-white/20 p-4">
                      <p className="text-[10px] font-medium">Column Empty</p>
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const badge = getUrgencyBadge(task.urgency);
                      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                      const completedCount = task.subtasks?.filter(s => s.completed).length || 0;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", task.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          className="bg-[#0c0c0e] border border-white/10 p-3.5 rounded-xl hover:border-indigo-500/40 hover:bg-[#111115] transition-all shadow-sm flex flex-col justify-between group cursor-grab active:cursor-grabbing"
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${badge.class}`}>
                                {badge.label}
                              </span>
                              <span className="text-[9px] text-white/30 uppercase tracking-wider font-mono">
                                {task.category}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-[10px] text-white/50 line-clamp-2 mt-1 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {/* Subtask progress */}
                            {hasSubtasks && (
                              <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                                <div className="flex justify-between items-center text-[9px] text-white/40">
                                  <span>Subtasks</span>
                                  <span>{completedCount}/{task.subtasks.length}</span>
                                </div>
                                <div className="space-y-1 max-h-24 overflow-y-auto">
                                  {task.subtasks.map(s => (
                                    <div
                                      key={s.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleSubtask(task.id, s.id);
                                      }}
                                      className="flex items-center gap-1.5 text-[9px] text-white/60 hover:text-white"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={s.completed}
                                        readOnly
                                        className="rounded border-white/20 text-indigo-600 focus:ring-0 w-3 h-3 cursor-pointer"
                                      />
                                      <span className={s.completed ? "line-through text-white/30" : ""}>
                                        {s.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-between items-center pt-3 mt-3 border-t border-white/5 text-[9px] text-white/40">
                            <div className="flex items-center gap-1.5 font-mono">
                              <Clock className="w-3.5 h-3.5 text-white/30" />
                              <span>{task.durationMinutes}m</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onDeleteTask(task.id)}
                                className="p-1 hover:text-red-400 rounded transition-colors"
                                title="Remove Task"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>

                              {task.status !== "COMPLETED" && (
                                <button
                                  onClick={() => shiftStatus(task)}
                                  className="p-1 hover:text-indigo-400 text-white/30 transition-colors flex items-center gap-0.5"
                                  title="Advance Stage"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* COMPACT LIST VIEW */
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01] text-white/40 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Task Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Risk Factor</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-white/30 italic">
                    No active tasks match your search filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => {
                  const badge = getUrgencyBadge(task.urgency);
                  return (
                    <tr key={task.id} className="hover:bg-white/[0.01] transition-all">
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-bold text-white/90">{task.title}</span>
                          {task.description && (
                            <span className="text-[11px] text-white/40 ml-2 italic max-w-xs truncate hidden md:inline-block">
                              — {task.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold text-white/50">{task.category}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">{task.durationMinutes}m</td>
                      <td className="py-3 px-4">
                        <select
                          value={task.status}
                          onChange={(e) => onUpdateStatus(task.id, e.target.value as any)}
                          className="bg-[#050505] border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white/70"
                        >
                          <option value="TODO">Backlog</option>
                          <option value="IN_PROGRESS">Active</option>
                          <option value="REVIEW">Review</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        {task.riskScore > 0 ? (
                          <div className="flex items-center gap-1">
                            <ShieldAlert className={`w-3.5 h-3.5 ${task.riskScore > 75 ? "text-red-400" : "text-amber-400"}`} />
                            <span className="font-mono text-[11px] text-white/70">{task.riskScore}%</span>
                          </div>
                        ) : (
                          <span className="text-green-400 text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3" /> Secure
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="text-white/30 hover:text-red-400 p-1 transition-all inline-block"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
