from fastapi import APIRouter, Depends
from pydantic import BaseModel
from models.schemas import StatsOut
from services.task_service import get_stats
from services.plan_service import get_all_goals
from agents.base import BaseAgent
from auth import get_current_user
from rate_limit import ai_rate_limit_dependency

router = APIRouter(prefix="/api/stats", tags=["stats"])

ANALYSIS_PROMPT = """你是 LearnPilot 的学习分析助手。根据用户的学习统计数据和目标信息，给出简洁的进度分析和改进建议。

要求：
1. 用中文回答。
2. 先总结整体进度（1-2 句话）。
3. 指出做得好的地方和需要改进的地方。
4. 给出 2-3 条具体的改进建议。
5. 保持精炼，300 字以内。
"""

analyzer = BaseAgent(system_prompt=ANALYSIS_PROMPT, reasoning_effort="low")


class AnalysisOut(BaseModel):
    analysis: str


@router.get("/overview", response_model=StatsOut)
def stats_overview(current_user: dict = Depends(get_current_user)):
    """获取学习进度统计。"""
    return get_stats(current_user["id"])


@router.get("/analysis", response_model=AnalysisOut)
def progress_analysis(current_user: dict = Depends(get_current_user), _rl=Depends(ai_rate_limit_dependency())):
    """AI 分析学习进度并给出建议。"""
    user_id = current_user["id"]
    stats = get_stats(user_id)
    goals = get_all_goals(user_id)

    # Build context for analysis
    context = f"## 学习统计\n"
    context += f"- 总目标数：{stats.total_goals}\n"
    context += f"- 进行中目标：{stats.active_goals}\n"
    context += f"- 总任务数：{stats.total_tasks}\n"
    context += f"- 已完成：{stats.completed_tasks}\n"
    context += f"- 进行中：{stats.in_progress_tasks}\n"
    context += f"- 待开始：{stats.pending_tasks}\n"
    context += f"- 完成率：{stats.completion_rate}%\n"
    context += f"- 今日任务：{stats.today_tasks}，已完成：{stats.today_completed}\n"

    if goals:
        context += f"\n## 学习目标\n"
        for g in goals:
            context += f"- {g.title}（{g.skill_level}，{g.daily_hours}h/天，{g.duration_weeks}周）状态：{g.status}\n"

    context += f"\n请分析我的学习进度并给出建议。"

    try:
        analysis = analyzer.chat(context)
    except Exception as e:
        analysis = f"分析生成失败：{e}"

    return AnalysisOut(analysis=analysis)
