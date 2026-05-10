import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  Clock,
  CalendarDays,
  BarChart3,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  PlusCircle,
} from "lucide-react";
import { getGoals } from "../api/goals";
import type { GoalOut } from "../api/goals";
import EmptyState from "../components/EmptyState";

const STATUS_LABELS: Record<string, string> = {
  active: "进行中",
  completed: "已完成",
  paused: "已暂停",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  paused: "bg-gray-100 text-gray-600",
};

const SKILL_LABELS: Record<string, string> = {
  beginner: "初学者",
  intermediate: "中级",
  advanced: "高级",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 bg-gray-200 rounded-xl" />
      ))}
    </div>
  );
}

export default function GoalList() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<GoalOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadGoals() {
    setLoading(true);
    setError(null);
    try {
      const data = await getGoals();
      setGoals(data);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "加载目标失败。";
      setError(detail);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target size={24} />
            学习目标
          </h2>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">加载学习目标失败</p>
            <p>{error}</p>
          </div>
        </div>
        <button
          onClick={loadGoals}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <RefreshCw size={14} />
          重试
        </button>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="暂无学习目标"
        description="创建一个学习目标，AI 将为你生成结构化的学习计划。"
        action={{ label: "创建目标", onClick: () => navigate("/goals/new") }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target size={24} />
          学习目标
          <span className="text-base font-normal text-gray-400 ml-1">({goals.length})</span>
        </h2>
        <button
          onClick={() => navigate("/goals/new")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <PlusCircle size={14} />
          新建目标
        </button>
      </div>

      {/* Goal cards */}
      <div className="space-y-3">
        {goals.map((goal) => (
          <div
            key={goal.id}
            onClick={() => navigate(`/plan/${goal.id}`)}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {goal.title}
                  </h3>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${
                      STATUS_COLORS[goal.status] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_LABELS[goal.status] || goal.status}
                  </span>
                </div>
                {goal.description && (
                  <p className="text-sm text-gray-500 truncate mb-3">
                    {goal.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <BarChart3 size={14} className="text-gray-400" />
                    {SKILL_LABELS[goal.skill_level] || goal.skill_level}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} className="text-gray-400" />
                    {goal.daily_hours} 小时/天
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays size={14} className="text-gray-400" />
                    {goal.duration_weeks} 周
                  </span>
                  <span className="text-xs text-gray-400">
                    创建于 {goal.created_at.replace("T", " ").slice(0, 10)}
                  </span>
                </div>
              </div>
              <ChevronRight
                size={20}
                className="text-gray-300 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-1"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
