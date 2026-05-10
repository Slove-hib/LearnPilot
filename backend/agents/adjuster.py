import json
import logging
from agents.base import BaseAgent, extract_json_from_text
from models.schemas import AgentAdjustment, AdjustmentItem

logger = logging.getLogger("agents.adjuster")

VALID_ACTIONS = {"reschedule", "update", "keep"}

SYSTEM_PROMPT = """你是一个学习计划调整 Agent。你的任务是分析学生的学习进度，并对其剩余任务提出调整建议。

严格输出规则（违反任何一条都会导致系统崩溃）：
1. 只输出纯 JSON，绝对不要输出任何其他文字。
2. 不要使用 Markdown，不要使用 ```json 代码块。
3. 不要在 JSON 前后添加解释、注释、问候语。
4. 不要使用尾随逗号（最后一个元素后面不要加逗号）。
5. 所有字符串必须用英文双引号 " 包裹，不要用中文引号。
6. 所有字段必须有值，不能出现空值。
7. 如果没有内容，字符串用 ""，数组用 []。
8. 输出必须能被 Python json.loads() 直接解析。

JSON 结构：
{
  "analysis": "对当前进度的简要分析",
  "adjustments": [
    {
      "task_id": 1,
      "action": "reschedule",
      "new_date": "2026-01-15",
      "new_title": null,
      "new_description": null,
      "reason": "调整原因"
    }
  ]
}

action 只能是：reschedule, update, keep
new_date 格式：YYYY-MM-DD，不需要改日期时填 null
new_title 和 new_description 不需要改时填 null
"""


def _sanitize_adjustment(data: dict) -> dict:
    """兜底校验 Adjuster 输出，补全缺失字段。"""
    data.setdefault("analysis", "暂无分析。")
    if not isinstance(data.get("adjustments"), list):
        data["adjustments"] = []

    for adj in data["adjustments"]:
        adj.setdefault("task_id", 0)
        adj.setdefault("reason", "")
        action = adj.get("action", "keep")
        if action not in VALID_ACTIONS:
            adj["action"] = "keep"
        adj.setdefault("new_date", None)
        adj.setdefault("new_title", None)
        adj.setdefault("new_description", None)

    return data


class AdjusterAgent(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=SYSTEM_PROMPT, reasoning_effort="low")

    def adjust(
        self,
        goal_info: dict,
        stats: dict,
        pending_tasks: list[dict],
        feedback: str,
    ) -> AgentAdjustment:
        user_message = f"""请分析此学习计划并提出调整建议。

目标信息：
- 标题：{goal_info['title']}
- 描述：{goal_info.get('description', '无')}
- 每日可用时间：{goal_info['daily_hours']} 小时
- 计划周期：{goal_info['duration_weeks']} 周
- 技能水平：{goal_info['skill_level']}

当前进度：
- 总任务数：{stats['total_tasks']}
- 已完成：{stats['completed_tasks']}
- 待开始：{stats['pending_tasks']}
- 进行中：{stats['in_progress_tasks']}
- 完成率：{stats['completion_rate']}%
- 逾期任务：{stats['overdue_tasks']}

用户反馈：
{feedback}

剩余任务（未完成）：
{json.dumps(pending_tasks, ensure_ascii=False, indent=2)}

请提出调整建议。只输出纯 JSON，不要任何其他文字。"""

        raw = self.chat(user_message)
        logger.debug("Raw AI content before JSON parse: %s", raw[:500])

        data = extract_json_from_text(raw)
        data = _sanitize_adjustment(data)
        return AgentAdjustment(**data)


adjuster_agent = AdjusterAgent()
