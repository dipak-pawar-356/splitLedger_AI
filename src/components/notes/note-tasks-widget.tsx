"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ListChecks,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Calendar,
  Flag,
  CheckSquare,
  Square,
  MoreVertical,
  Sliders,
  Filter,
} from "lucide-react";
import {
  getNoteTasks,
  createNoteTask,
  updateNoteTask,
  duplicateNoteTask,
  deleteNoteTask,
} from "@/actions/notes";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface NoteTasksWidgetProps {
  notePublicId: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "Urgent", color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200" },
  high: { label: "High", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200" },
  medium: { label: "Medium", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200" },
  low: { label: "Low", color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900 border-slate-200" },
};

export function NoteTasksWidget({ notePublicId }: NoteTasksWidgetProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  // Active filter tab
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "in_progress" | "completed" | "urgent">("all");

  // Expanded task ID for subtasks & notes
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await getNoteTasks(notePublicId);
      setTasks(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [notePublicId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await createNoteTask(notePublicId, {
        title: newTitle.trim(),
        priority: newPriority,
        dueDate: newDueDate ? new Date(newDueDate) : undefined,
      });
      setNewTitle("");
      setNewDueDate("");
      setIsFormExpanded(false);
      fetchTasks();
      toast.success("Task added!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add task");
    }
  };

  const handleToggleStatus = async (task: any) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    const nextProgress = nextStatus === "completed" ? 100 : 0;
    try {
      await updateNoteTask(task.publicId, {
        status: nextStatus,
        progress: nextProgress,
      });
      fetchTasks();
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  const handleProgressChange = async (task: any, progress: number) => {
    const nextStatus = progress === 100 ? "completed" : progress > 0 ? "in_progress" : "pending";
    try {
      await updateNoteTask(task.publicId, {
        progress,
        status: nextStatus,
      });
      fetchTasks();
    } catch (err: any) {
      toast.error("Failed to update progress");
    }
  };

  const handlePriorityChange = async (task: any, priority: string) => {
    try {
      await updateNoteTask(task.publicId, { priority });
      fetchTasks();
      toast.success(`Priority updated to ${priority}`);
    } catch (err: any) {
      toast.error("Failed to update priority");
    }
  };

  const handleDuplicate = async (task: any) => {
    try {
      await duplicateNoteTask(task.publicId);
      fetchTasks();
      toast.success("Task duplicated!");
    } catch (err: any) {
      toast.error("Failed to duplicate task");
    }
  };

  const handleDelete = async (task: any) => {
    try {
      await deleteNoteTask(task.publicId);
      fetchTasks();
      toast.success("Task deleted");
    } catch (err: any) {
      toast.error("Failed to delete task");
    }
  };

  // Subtask management
  const handleAddSubtask = async (task: any) => {
    if (!newSubtaskTitle.trim()) return;
    const currentSubtasks = Array.isArray(task.subtasks) ? [...task.subtasks] : [];
    currentSubtasks.push({
      id: "sub_" + Date.now(),
      title: newSubtaskTitle.trim(),
      completed: false,
    });

    try {
      await updateNoteTask(task.publicId, { subtasks: currentSubtasks });
      setNewSubtaskTitle("");
      fetchTasks();
    } catch (err) {
      toast.error("Failed to add subtask");
    }
  };

  const handleToggleSubtask = async (task: any, subtaskId: string) => {
    const currentSubtasks = Array.isArray(task.subtasks) ? [...task.subtasks] : [];
    const updated = currentSubtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const completedCount = updated.filter((s) => s.completed).length;
    const progress = Math.round((completedCount / updated.length) * 100);

    try {
      await updateNoteTask(task.publicId, {
        subtasks: updated,
        progress,
        status: progress === 100 ? "completed" : progress > 0 ? "in_progress" : "pending",
      });
      fetchTasks();
    } catch (err) {
      toast.error("Failed to toggle subtask");
    }
  };

  const handleDeleteSubtask = async (task: any, subtaskId: string) => {
    const currentSubtasks = Array.isArray(task.subtasks) ? [...task.subtasks] : [];
    const filtered = currentSubtasks.filter((st) => st.id !== subtaskId);

    try {
      await updateNoteTask(task.publicId, { subtasks: filtered });
      fetchTasks();
    } catch (err) {
      toast.error("Failed to delete subtask");
    }
  };

  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === "pending") return t.status === "pending";
    if (activeFilter === "in_progress") return t.status === "in_progress";
    if (activeFilter === "completed") return t.status === "completed";
    if (activeFilter === "urgent") return t.priority === "urgent" || t.priority === "high";
    return true;
  });

  return (
    <Card className="rounded-2xl border shadow-sm p-4 space-y-3.5 bg-card">
      {/* Widget Header with Progress */}
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
            <ListChecks className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Tasks & Action Items
            </h4>
            <p className="text-[10px] text-slate-400">
              {completedTasks} of {totalTasks} completed ({totalProgress}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={totalProgress === 100 ? "default" : "secondary"}
            className="text-[10px] font-mono shrink-0"
          >
            {totalProgress}% Complete
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs rounded-xl px-2.5 gap-1 text-primary border-primary/20"
            onClick={() => setIsFormExpanded(!isFormExpanded)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {totalTasks > 0 && (
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              totalProgress === 100 ? "bg-emerald-500" : "bg-primary"
            }`}
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      )}

      {/* Add Task Form (Expandable) */}
      {isFormExpanded && (
        <form onSubmit={handleCreateTask} className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What needs to be done? e.g., Reconcile monthly statement..."
            className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900"
            autoFocus
          />

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <select
                value={newPriority}
                onChange={(e: any) => setNewPriority(e.target.value)}
                className="h-7 text-[11px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>

              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="h-7 text-[11px] w-32 rounded-lg bg-white dark:bg-slate-900 px-2"
                title="Due Date"
              />
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs rounded-lg px-2"
                onClick={() => setIsFormExpanded(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-7 text-xs rounded-lg px-3 bg-primary text-white"
                disabled={!newTitle.trim()}
              >
                Save Task
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-800 pb-2 overflow-x-auto text-[11px]">
        {(
          [
            { id: "all", label: `All (${totalTasks})` },
            { id: "pending", label: "Pending" },
            { id: "in_progress", label: "In Progress" },
            { id: "completed", label: "Completed" },
            { id: "urgent", label: "Urgent" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
              activeFilter === tab.id
                ? "bg-primary text-white"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {filteredTasks.map((task) => {
          const isExpanded = expandedTaskId === task.publicId;
          const isDone = task.status === "completed";
          const priorityStyle = PRIORITY_CONFIG[task.priority || "medium"] || PRIORITY_CONFIG.medium;
          const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];

          return (
            <div
              key={task.id}
              className={`rounded-xl border transition-all ${
                isDone
                  ? "border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 opacity-75"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {/* Task Row */}
              <div className="p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Status Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(task)}
                    className="shrink-0 transition-transform active:scale-90"
                    title={isDone ? "Mark Pending" : "Mark Completed"}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
                    ) : task.progress > 0 ? (
                      <div className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center text-[8px] font-bold text-primary">
                        {task.progress}
                      </div>
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600 hover:text-primary" />
                    )}
                  </button>

                  {/* Title & Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs font-medium truncate ${
                          isDone ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {task.title}
                      </span>

                      {/* Priority Tag */}
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 rounded-md border ${priorityStyle.bg} ${priorityStyle.color}`}
                      >
                        {priorityStyle.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                      {subtasks.length > 0 && (
                        <span>
                          {subtasks.filter((s: any) => s.completed).length}/{subtasks.length} subtasks
                        </span>
                      )}
                      {task.progress > 0 && <span>• {task.progress}%</span>}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    onClick={() => setExpandedTaskId(isExpanded ? null : task.publicId)}
                    title={isExpanded ? "Collapse Details" : "Expand Subtasks & Settings"}
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem onClick={() => handleDuplicate(task)} className="gap-2 cursor-pointer">
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Duplicate</span>
                      </DropdownMenuItem>

                      {/* Priority Options */}
                      <DropdownMenuItem onClick={() => handlePriorityChange(task, "urgent")} className="text-rose-600 gap-2 cursor-pointer">
                        <Flag className="h-3.5 w-3.5" />
                        <span>Set Urgent</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePriorityChange(task, "high")} className="text-amber-600 gap-2 cursor-pointer">
                        <Flag className="h-3.5 w-3.5" />
                        <span>Set High</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePriorityChange(task, "medium")} className="text-blue-600 gap-2 cursor-pointer">
                        <Flag className="h-3.5 w-3.5" />
                        <span>Set Medium</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => handleDelete(task)} className="text-rose-600 gap-2 cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Task</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Expandable Subtasks & Progress Details */}
              {isExpanded && (
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                  {/* Progress Bar & Quick Sliders */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mb-1.5">
                      <span>Task Progress ({task.progress}%)</span>
                      <div className="flex items-center gap-1">
                        {[0, 25, 50, 75, 100].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleProgressChange(task, p)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                              task.progress === p
                                ? "bg-primary text-white border-primary"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-200"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Subtasks Checklist */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Subtasks ({subtasks.filter((s: any) => s.completed).length}/{subtasks.length})
                    </span>

                    {subtasks.map((st: any) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleSubtask(task, st.id)}
                          className="flex items-center gap-2 text-left flex-1 min-w-0"
                        >
                          {st.completed ? (
                            <CheckSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          )}
                          <span
                            className={`truncate text-xs ${
                              st.completed ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {st.title}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(task, st.id)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {/* Add Subtask Input */}
                    <div className="flex items-center gap-1 pt-1">
                      <Input
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddSubtask(task)}
                        placeholder="+ Add subtask..."
                        className="h-7 text-xs rounded-lg bg-white dark:bg-slate-900 flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddSubtask(task)}
                        className="h-7 px-2.5 text-xs rounded-lg bg-primary"
                        disabled={!newSubtaskTitle.trim()}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredTasks.length === 0 && !isLoading && (
          <div className="py-6 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <ListChecks className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <p className="font-medium text-slate-600 dark:text-slate-400">No tasks in this view</p>
            <p className="text-[10px] text-slate-400">Click &apos;Add Task&apos; above to record action items for this note.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
