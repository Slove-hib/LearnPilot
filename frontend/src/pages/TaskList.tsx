import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CheckSquare,
  CheckCircle,
  Circle,
  Clock,
  CalendarDays,
  ListTodo,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getTodayTasks, getTasks, updateTaskStatus } from "../api/tasks";
import type { TaskStatus } from "../api/tasks";
import type { TaskOut } from "../api/goals";
import EmptyState from "../components/EmptyState";

const STATUS_COLORS: Record<string, string> = {
  done: "bg-green-100 text-green-700",
  in_progress: "bg-amber-100 text-amber-700",
  pending: "bg-gray-100 text-gray-600",
};

const TASK_TYPE_COLORS: Record<string, string> = {
  learn: "bg-blue-100 text-blue-700",
  practice: "bg-purple-100 text-purple-700",
  review: "bg-amber-100 text-amber-700",
  project: "bg-green-100 text-green-700",
};

const TASK_TYPE_LABELS: Record<string, string> = {
  learn: "学习",
  practice: "练习",
  review: "复习",
  project: "项目",
};

const STATUS_LABELS: Record<string, string> = {
  done: "已完成",
  in_progress: "进行中",
  pending: "待开始",
};

const FILTER_LABELS: Record<string, string> = {
  all: "全部",
  pending: "未完成",
  done: "已完成",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "done") return <CheckCircle size={18} className="text-green-500" />;
  if (status === "in_progress") return <Clock size={18} className="text-amber-500" />;
  return <Circle size={18} className="text-gray-300" />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-20 bg-gray-200 rounded-lg" />
      ))}
    </div>
  );
}

export default function TaskList() {
  const [searchParams] = useSearchParams();

  const [tasks, setTasks] = useState<TaskOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Filter controls — initialized from URL params
  const [goalIdInput, setGoalIdInput] = useState(() => searchParams.get("goal_id") || "");
  const [dateInput, setDateInput] = useState(() => searchParams.get("date") || "");
  const [queryGoalId, setQueryGoalId] = useState<number | undefined>(() => {
    const v = searchParams.get("goal_id");
    return v ? Number(v) : undefined;
  });
  const [queryDate, setQueryDate] = useState<string | undefined>(() => {
    return searchParams.get("date") || undefined;
  });

  // Read status filter from URL
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam === "done" || statusParam === "pending") {
      setFilter(statusParam);
    }
  }, [searchParams]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: TaskOut[];
      if (queryGoalId !== undefined || queryDate !== undefined) {
        data = await getTasks({ goal_id: queryGoalId, date: queryDate });
      } else {
        const res = await getTodayTasks();
        data = res.tasks;
      }
      setTasks(data);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "加载任务失败。";
      setError(detail);
    } finally {
      setLoading(false);
    }
  }, [queryGoalId, queryDate]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  function handleSearch() {
    const gid = goalIdInput.trim() ? Number(goalIdInput.trim()) : undefined;
    const dt = dateInput || undefined;
    setQueryGoalId(gid);
    setQueryDate(dt);
  }

  function handleShowToday() {
    setGoalIdInput("");
    setDateInput("");
    setQueryGoalId(undefined);
    setQueryDate(undefined);
  }

  async function handleStatusChange(taskId: number, newStatus: TaskStatus) {
    setUpdatingId(taskId);
    try {
      const updated = await updateTaskStatus(taskId, newStatus);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "更新任务失败。";
      toast.error(detail);
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = tasks.filter((t) => {
    if (filter === "pending") return t.status !== "done";
    if (filter === "done") return t.status === "done";
    return true;
  });

  const isToday = queryGoalId === undefined && queryDate === undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CheckSquare size={24} />
          任务列表
          {isToday && <span className="text-base font-normal text-gray-400 ml-1">今日</span>}
        </h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(["all", "pending", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {FILTER_LABELS[f] || f}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="目标 ID"
            value={goalIdInput}
            onChange={(e) => setGoalIdInput(e.target.value)}
            className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-gray-400" />
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Search size={14} />
          搜索
        </button>
        <button
          onClick={handleShowToday}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
            isToday
              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
              : "text-gray-600 border-gray-300 hover:bg-gray-50"
          }`}
        >
          今日
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="没有找到任务"
          description={
            isToday
              ? "今天没有安排任务。请尝试按目标 ID 或日期搜索。"
              : "没有匹配的任务，请尝试其他筛选条件。"
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const isUpdating = updatingId === task.id;
            return (
              <div
                key={task.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <StatusIcon status={task.status} />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium ${
                        task.status === "done" ? "line-through text-gray-400" : "text-gray-900"
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-gray-500 truncate">{task.description}</p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${
                      TASK_TYPE_COLORS[task.task_type] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_COLORS[task.status]}`}
                  >
                    {STATUS_LABELS[task.status] || task.status}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{task.task_date}</span>
                </div>

                {/* Status actions */}
                <div className="flex items-center gap-2 mt-3 pl-8">
                  <span className="text-xs text-gray-400 mr-1">设置状态：</span>
                  {(["pending", "in_progress", "done"] as TaskStatus[]).map((s) => (
                    <button
                      key={s}
                      disabled={task.status === s || isUpdating}
                      onClick={() => handleStatusChange(task.id, s)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-40 ${
                        task.status === s
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "text-gray-600 border-gray-300 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      {isUpdating ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        STATUS_LABELS[s] || s
                      )}
                    </button>
                  ))}
                  {task.completed_at && (
                    <span className="text-xs text-gray-400 ml-2">
                      完成于 {task.completed_at.replace("T", " ").slice(0, 16)}
                    </span>
                  )}
                  <span className="text-xs text-gray-300 ml-auto">
                    goal:{task.goal_id} phase:{task.phase_id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
