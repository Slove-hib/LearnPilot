import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Circle,
  Clock,
  RefreshCw,
  AlertCircle,
  Loader2,
  Target,
  Wand2,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { getGoalPlan, adjustPlan } from "../api/goals";
import type { GoalWithPlan, PhaseOut, AdjustmentResult } from "../api/goals";
import { updateTaskStatus } from "../api/tasks";
import type { TaskStatus } from "../api/tasks";
import EmptyState from "../components/EmptyState";

const TASK_TYPE_LABELS: Record<string, string> = {
  learn: "学习",
  practice: "练习",
  review: "复习",
  project: "项目",
};

function StatusIcon({
  status,
  onClick,
  loading,
}: {
  status: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  if (loading) {
    return <Loader2 size={16} className="text-indigo-400 animate-spin flex-shrink-0" />;
  }

  if (status === "done") {
    return (
      <CheckCircle
        size={16}
        className="text-green-500 flex-shrink-0 cursor-pointer hover:text-green-600"
        onClick={onClick}
      />
    );
  }
  if (status === "in_progress") {
    return (
      <Clock
        size={16}
        className="text-amber-500 flex-shrink-0 cursor-pointer hover:text-amber-600"
        onClick={onClick}
      />
    );
  }
  return (
    <Circle
      size={16}
      className="text-gray-300 flex-shrink-0 cursor-pointer hover:text-indigo-400"
      onClick={onClick}
    />
  );
}

function TaskTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    learn: "bg-blue-100 text-blue-700",
    practice: "bg-purple-100 text-purple-700",
    review: "bg-amber-100 text-amber-700",
    project: "bg-green-100 text-green-700",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors[type] || "bg-gray-100 text-gray-600"}`}>
      {TASK_TYPE_LABELS[type] || type}
    </span>
  );
}

function ProgressStats({ phases }: { phases: PhaseOut[] }) {
  const allTasks = phases.flatMap((p) => p.tasks);
  const total = allTasks.length;
  const done = allTasks.filter((t) => t.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">整体进度</span>
        <span className="text-sm text-gray-500">
          已完成 {done} / {total} 个任务（{pct}%）
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PhaseCard({
  phase,
  index,
  expanded,
  onToggle,
  goalId,
  onTaskToggle,
  togglingTaskId,
}: {
  phase: PhaseOut;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  goalId: number;
  onTaskToggle: (taskId: number, newStatus: TaskStatus) => void;
  togglingTaskId: number | null;
}) {
  const navigate = useNavigate();
  const done = phase.tasks.filter((t) => t.status === "done").length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown size={18} className="text-gray-400" />
          ) : (
            <ChevronRight size={18} className="text-gray-400" />
          )}
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">
              阶段 {index + 1}：{phase.title}
            </h3>
            <p className="text-sm text-gray-500">
              第 {phase.week_start}-{phase.week_end} 周
              {phase.description ? ` · ${phase.description}` : ""}
            </p>
          </div>
        </div>
        <span className="text-sm text-gray-400">
          {done}/{phase.tasks.length} 已完成
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-6 py-3 space-y-2">
          {phase.tasks.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">该阶段暂无任务。</p>
          ) : (
            phase.tasks.map((task) => {
              const isToggling = togglingTaskId === task.id;
              const nextStatus: TaskStatus = task.status === "done" ? "pending" : "done";

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 group"
                >
                  <StatusIcon
                    status={task.status}
                    loading={isToggling}
                    onClick={() => {
                      if (!isToggling) onTaskToggle(task.id, nextStatus);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm ${
                        task.status === "done"
                          ? "line-through text-gray-400"
                          : "text-gray-800"
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.description && (
                      <p className="text-xs text-gray-400 truncate">{task.description}</p>
                    )}
                  </div>
                  <TaskTypeBadge type={task.task_type} />
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {task.task_date}
                  </span>
                  <button
                    onClick={() =>
                      navigate(`/chat?goal_id=${goalId}&task_id=${task.id}`)
                    }
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded transition-all flex-shrink-0"
                    title="问辅导老师"
                  >
                    <MessageCircle size={12} />
                    提问
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function AdjustmentResultPanel({ result }: { result: AdjustmentResult }) {
  if (result.adjustments.length === 0 && !result.analysis) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-amber-900 flex items-center gap-2">
        <Wand2 size={18} />
        调整结果
      </h3>

      {result.analysis && (
        <p className="text-sm text-amber-800 leading-relaxed">{result.analysis}</p>
      )}

      {result.adjustments.length > 0 && (
        <div>
          <p className="text-xs font-medium text-amber-700 mb-2">变更内容：</p>
          <div className="space-y-2">
            {result.adjustments.map((adj, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-white rounded-lg px-3 py-2 text-sm"
              >
                <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                  {adj.action}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-gray-700">任务 #{adj.task_id}</span>
                  {adj.new_date && (
                    <span className="text-gray-500 ml-2">
                      <ArrowRight size={12} className="inline" /> {adj.new_date}
                    </span>
                  )}
                  {adj.reason && (
                    <p className="text-xs text-gray-500 mt-0.5">{adj.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.updated_tasks.length > 0 && (
        <div>
          <p className="text-xs font-medium text-amber-700 mb-2">更新后的任务：</p>
          <div className="space-y-1">
            {result.updated_tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 text-sm"
              >
                <span className="text-gray-800 font-medium">{t.title}</span>
                <span className="text-xs text-gray-400">{t.task_date}</span>
                <span className="text-xs text-gray-400">{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64" />
      <div className="h-4 bg-gray-200 rounded w-96" />
      <div className="h-14 bg-gray-200 rounded-xl" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-gray-200 rounded-xl" />
      ))}
    </div>
  );
}

export default function PlanView() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<GoalWithPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Adjust state
  const [feedback, setFeedback] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustResult, setAdjustResult] = useState<AdjustmentResult | null>(null);

  // Task toggle state
  const [togglingTaskId, setTogglingTaskId] = useState<number | null>(null);

  async function loadPlan() {
    if (!goalId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getGoalPlan(Number(goalId));
      setData(res);
      if (res.phases.length > 0) {
        setExpanded(new Set([res.phases[0].id]));
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Failed to load plan.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlan();
  }, [goalId]);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleTaskToggle(taskId: number, newStatus: TaskStatus) {
    setTogglingTaskId(taskId);
    try {
      await updateTaskStatus(taskId, newStatus);
      await loadPlan();
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "更新任务失败。";
      toast.error(detail);
    } finally {
      setTogglingTaskId(null);
    }
  }

  async function handleAdjust() {
    if (!goalId || !feedback.trim()) return;

    setAdjusting(true);
    setAdjustError(null);
    setAdjustResult(null);

    try {
      const result = await adjustPlan(Number(goalId), feedback.trim());
      setAdjustResult(result);
      setFeedback("");
      await loadPlan();
    } catch (err: any) {
      const detail =
        err.response?.data?.detail || err.message || "Failed to adjust plan.";
      setAdjustError(detail);
    } finally {
      setAdjusting(false);
    }
  }

  // No goalId — show empty state
  if (!goalId) {
    return (
      <EmptyState
        icon={BookOpen}
        title="暂无学习计划"
        description="请先创建一个学习目标，AI 生成的学习计划将显示在这里。"
        action={{ label: "创建目标", onClick: () => navigate("/goals/new") }}
      />
    );
  }

  // Loading
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Error
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">加载学习计划失败</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { goal, phases } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={24} />
            {goal.title}
          </h2>
          {goal.description && (
            <p className="text-gray-500 mt-1">{goal.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="capitalize">{goal.skill_level}</span>
            <span>&middot;</span>
            <span>{goal.daily_hours}h / day</span>
            <span>&middot;</span>
            <span>{goal.duration_weeks} weeks</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <ProgressStats phases={phases} />

      {/* Adjust Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Wand2 size={16} />
          AI 调整学习计划
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !adjusting && handleAdjust()}
            placeholder="例如：这周太忙了，能把任务往后推一推吗？"
            disabled={adjusting}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-50"
          />
          <button
            onClick={handleAdjust}
            disabled={!feedback.trim() || adjusting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {adjusting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                调整计划
              </>
            )}
          </button>
        </div>
        {adjusting && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" />
            调整 Agent 正在分析你的学习进度...
          </p>
        )}
        {adjustError && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{adjustError}</span>
          </div>
        )}
      </div>

      {/* Adjustment Result */}
      {adjustResult && <AdjustmentResultPanel result={adjustResult} />}

      {/* Phases */}
      {phases.length === 0 ? (
        <EmptyState
          icon={Target}
          title="尚未生成阶段"
          description="规划器没有生成任何阶段，请尝试创建新的学习目标。"
        />
      ) : (
        <div className="space-y-4">
          {phases.map((phase, i) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              index={i}
              expanded={expanded.has(phase.id)}
              onToggle={() => toggle(phase.id)}
              goalId={Number(goalId)}
              onTaskToggle={handleTaskToggle}
              togglingTaskId={togglingTaskId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
