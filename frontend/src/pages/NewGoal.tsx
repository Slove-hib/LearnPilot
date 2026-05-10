import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target, Loader2, AlertCircle } from "lucide-react";
import { createGoal } from "../api/goals";
import type { GoalCreate } from "../api/goals";

const LEVELS: GoalCreate["skill_level"][] = ["beginner", "intermediate", "advanced"];

const LEVEL_LABELS: Record<string, string> = {
  beginner: "初学者",
  intermediate: "中级",
  advanced: "高级",
};

export default function NewGoal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    daily_hours: 2,
    duration_weeks: 8,
    skill_level: "beginner" as GoalCreate["skill_level"],
  });

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("请输入学习目标。");
      return;
    }
    if (form.daily_hours <= 0 || form.duration_weeks <= 0) {
      setError("每日学习时长和计划周期必须大于 0。");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createGoal(form);
      navigate(`/plan/${result.goal.id}`);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "创建目标失败。";
      setError(detail);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target size={24} />
          创建学习目标
        </h2>
        <p className="text-gray-500 mt-1">
          告诉我们你想学什么，AI Agent 将为你生成个性化学习计划。
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            学习目标 *
          </label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="例如：3个月学会 Python 后端开发"
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            目标描述
          </label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="描述你的学习目标、背景和期望达成的成果..."
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none disabled:bg-gray-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              每日学习时长（小时）*
            </label>
            <input
              type="number"
              required
              min={0.5}
              max={12}
              step={0.5}
              value={form.daily_hours}
              onChange={(e) => update("daily_hours", parseFloat(e.target.value))}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              计划周期（周）*
            </label>
            <input
              type="number"
              required
              min={1}
              max={52}
              value={form.duration_weeks}
              onChange={(e) => update("duration_weeks", parseInt(e.target.value))}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            当前技能水平 *
          </label>
          <div className="flex gap-3">
            {LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                disabled={loading}
                onClick={() => update("skill_level", level)}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                  form.skill_level === level
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-indigo-300"
                }`}
              >
                {LEVEL_LABELS[level] || level}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              规划 Agent 正在生成学习计划...
            </>
          ) : (
            "生成学习计划"
          )}
        </button>
      </form>
    </div>
  );
}
