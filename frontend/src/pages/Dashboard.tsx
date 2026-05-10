import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Target,
  CheckCircle,
  Clock,
  TrendingUp,
  Bot,
  CalendarCheck,
  Sparkles,
  BarChart3,
  ListTodo,
  RefreshCw,
  AlertCircle,
  PlusCircle,
  Download,
  FileText,
  Database,
  Loader2,
} from "lucide-react";
import StatCard from "../components/StatCard";
import { getOverviewStats, getProgressAnalysis } from "../api/stats";
import type { StatsOverview } from "../api/stats";
import { getTodayTasks } from "../api/tasks";
import { exportReport, exportData } from "../api/export";
import type { TaskOut } from "../api/goals";

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

const STATUS_COLORS: Record<string, string> = {
  done: "bg-green-100 text-green-700",
  in_progress: "bg-amber-100 text-amber-700",
  pending: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  done: "已完成",
  in_progress: "进行中",
  pending: "待开始",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="h-48 bg-gray-200 rounded-xl" />
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [todayTasks, setTodayTasks] = useState<TaskOut[]>([]);
  const [todayDate, setTodayDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, tasksRes] = await Promise.all([
        getOverviewStats(),
        getTodayTasks(),
      ]);
      setStats(statsRes);
      setTodayTasks(tasksRes.tasks);
      setTodayDate(tasksRes.date);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "加载数据失败。";
      setError(detail);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Close export menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleExportReport() {
    setExporting(true);
    setShowExport(false);
    try {
      await exportReport();
      toast.success("报告已下载");
    } catch (err: any) {
      toast.error(err.message || "导出失败");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportData() {
    setExporting(true);
    setShowExport(false);
    try {
      await exportData();
      toast.success("数据已下载");
    } catch (err: any) {
      toast.error(err.message || "导出失败");
    } finally {
      setExporting(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await getProgressAnalysis();
      setAnalysis(result);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "分析失败";
      toast.error(detail);
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">加载仪表盘失败</p>
            <p>{error}</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <RefreshCw size={14} />
          重试
        </button>
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">欢迎使用 LearnPilot</h2>
          <p className="text-gray-500 mt-1">
            你的 AI 智能学习伙伴。设定目标、获取计划，让学习更高效。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            刷新
          </button>
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              导出
            </button>
            {showExport && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={handleExportReport}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors"
                >
                  <FileText size={14} />
                  Markdown 报告
                </button>
                <button
                  onClick={handleExportData}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg transition-colors"
                >
                  <Database size={14} />
                  JSON 数据备份
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="进行中的目标" value={s.active_goals} icon={Target} color="indigo" to="/plan" />
        <StatCard label="今日任务" value={s.today_tasks} icon={CalendarCheck} color="blue" to="/tasks" />
        <StatCard label="已完成任务" value={s.completed_tasks} icon={CheckCircle} color="green" to="/tasks?status=done" />
        <StatCard label="完成率" value={`${s.completion_rate}%`} icon={TrendingUp} color="amber" to="/tasks" />
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <BarChart3 size={16} />
            整体学习进度
          </h3>
          <span className="text-sm text-gray-500">
            已完成 {s.completed_tasks} / {s.total_tasks} 个任务
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${s.completion_rate}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <span>{s.pending_tasks} 个待开始</span>
          <span>{s.in_progress_tasks} 个进行中</span>
          <span>{s.completed_tasks} 个已完成</span>
        </div>
      </div>

      {/* AI Progress Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500" />
            AI 进度分析
          </h3>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                生成分析
              </>
            )}
          </button>
        </div>
        {analysis && (
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-indigo-50 rounded-lg p-4">
            {analysis}
          </div>
        )}
      </div>

      {/* Today's Tasks */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Clock size={18} />
            今日任务
            {todayDate && <span className="text-sm font-normal text-gray-400 ml-1">({todayDate})</span>}
          </h3>
          {todayTasks.length > 0 && (
            <Link
              to="/tasks"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              查看全部 &rarr;
            </Link>
          )}
        </div>

        {todayTasks.length === 0 ? (
          <div className="text-center py-8">
            <ListTodo size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 mb-4">今天没有安排任务。</p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/tasks"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ListTodo size={14} />
                查看全部任务
              </Link>
              <Link
                to="/goals/new"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <PlusCircle size={14} />
                创建新目标
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <Link
                key={task.id}
                to={`/tasks?date=${todayDate}`}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      task.status === "done" ? "line-through text-gray-400" : "text-gray-800"
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-gray-400 truncate">{task.description}</p>
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
              </Link>
            ))}
            {s.today_completed > 0 && (
              <p className="text-xs text-gray-400 pt-2 text-right">
                今日已完成 {s.today_completed} / {s.today_tasks}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Agent Capabilities */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Bot size={18} />
          AI Agent 能力介绍
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-indigo-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-indigo-600" />
              <span className="font-medium text-indigo-900">规划 Agent</span>
            </div>
            <p className="text-sm text-indigo-700">
              分析你的学习目标，自动生成分阶段、分任务的结构化学习计划。
            </p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-amber-600" />
              <span className="font-medium text-amber-900">调整 Agent</span>
            </div>
            <p className="text-sm text-amber-700">
              监控学习进度，当你落后或改变节奏时，动态调整学习计划。
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-green-600" />
              <span className="font-medium text-green-900">辅导 Agent</span>
            </div>
            <p className="text-sm text-green-700">
              基于你的学习上下文，提供针对性的答疑辅导，根据水平调整解释深度。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
