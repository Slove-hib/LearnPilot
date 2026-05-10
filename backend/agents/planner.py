import logging
from agents.base import BaseAgent, extract_json_from_text
from models.schemas import AgentPlan, AgentPhase, AgentTask

logger = logging.getLogger("agents.planner")

SYSTEM_PROMPT = """你是一个学习计划生成器。你的任务是创建结构化、可执行的学习计划。

语言规则（非常重要）：
- 你必须使用用户输入的主要语言生成所有内容
- 如果用户使用中文提问，则 phase.title、phase.description、task.title、task.description 必须使用中文
- 如果用户使用英文提问，则使用英文
- JSON 字段名（phases、title、description、week_start、week_end、tasks、task_date、task_type、sort_order）必须保持英文，不要翻译
- task_type 只能使用英文枚举值：learn、practice、review、project

严格输出规则（违反任何一条都会导致系统崩溃）：
1. 只输出纯 JSON，绝对不要输出任何其他文字。
2. 不要使用 Markdown，不要使用 ```json 代码块。
3. 不要在 JSON 前后添加解释、注释、问候语。
4. 不要使用尾随逗号（最后一个元素后面不要加逗号）。
5. 所有字符串必须用英文双引号 " 包裹，不要用中文引号。
6. 所有字段必须有值，不能出现空值，例如不要写 "description": 后面直接换行。
7. 如果没有内容，字符串用 ""，数组用 []。
8. 输出必须能被 Python json.loads() 直接解析。

JSON 结构（注意：以下示例用中文，实际输出语言跟随用户输入）：
{
  "phases": [
    {
      "title": "阶段标题",
      "description": "阶段描述",
      "week_start": 1,
      "week_end": 3,
      "tasks": [
        {
          "title": "任务标题",
          "description": "任务描述",
          "task_date": "2026-01-01",
          "task_type": "learn",
          "sort_order": 1
        }
      ]
    }
  ]
}

task_type 只能是：learn, practice, review, project
task_date 格式：YYYY-MM-DD
"""


def _sanitize_plan(data: dict) -> dict:
    """兜底校验 Planner 输出，补全缺失字段。"""
    if "phases" not in data or not isinstance(data["phases"], list):
        raise ValueError("模型返回的 JSON 缺少 'phases' 字段或格式错误")

    for phase_idx, phase in enumerate(data["phases"]):
        phase.setdefault("title", f"阶段 {phase_idx + 1}")
        phase.setdefault("description", "")
        phase.setdefault("week_start", phase_idx + 1)
        phase.setdefault("week_end", phase_idx + 1)
        if not isinstance(phase.get("tasks"), list):
            phase["tasks"] = []

        for task_idx, task in enumerate(phase["tasks"]):
            task.setdefault("title", "未命名任务")
            task.setdefault("description", "")
            task.setdefault("task_type", "learn")
            task.setdefault("task_date", "2026-01-01")
            task.setdefault("sort_order", task_idx + 1)

    return data


class PlannerAgent(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=SYSTEM_PROMPT, reasoning_effort="low")

    def generate_plan(
        self,
        title: str,
        description: str,
        daily_hours: float,
        duration_weeks: int,
        skill_level: str,
    ) -> AgentPlan:
        from datetime import date, timedelta

        start_date = date.today() + timedelta(days=1)

        user_message = f"""请根据以下参数创建学习计划。

参数：
- 目标：{title}
- 详情：{description or '无额外说明'}
- 每日可用时间：{daily_hours} 小时
- 计划周期：{duration_weeks} 周
- 当前水平：{skill_level}
- 开始日期：{start_date.isoformat()}

要求：
- 从 {start_date.isoformat()} 开始生成每日任务
- 每个任务大约需要 {daily_hours} 小时或更少
- 任务日期必须是真实日期，格式 YYYY-MM-DD
- 只输出纯 JSON，不要任何其他文字"""

        raw = self.chat(user_message)
        logger.debug("Raw AI content before JSON parse: %s", raw[:500])

        data = extract_json_from_text(raw)
        data = _sanitize_plan(data)
        return AgentPlan(**data)


planner_agent = PlannerAgent()
