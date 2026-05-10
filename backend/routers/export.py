import json
from datetime import date
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from services.task_service import get_stats
from services.plan_service import get_all_goals, get_goal_with_plan
from database import get_db
from auth import get_current_user
import io

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/report")
def export_report(current_user: dict = Depends(get_current_user)):
    """导出 Markdown 格式的学习进度报告。"""
    user_id = current_user["id"]
    stats = get_stats(user_id)
    goals = get_all_goals(user_id)

    lines = []
    lines.append(f"# LearnPilot 学习报告")
    lines.append(f"")
    lines.append(f"生成日期：{date.today().isoformat()}")
    lines.append(f"用户：{current_user['username']}")
    lines.append(f"")

    # Stats overview
    lines.append(f"## 学习统计")
    lines.append(f"")
    lines.append(f"| 指标 | 数值 |")
    lines.append(f"|------|------|")
    lines.append(f"| 总目标数 | {stats.total_goals} |")
    lines.append(f"| 进行中目标 | {stats.active_goals} |")
    lines.append(f"| 总任务数 | {stats.total_tasks} |")
    lines.append(f"| 已完成任务 | {stats.completed_tasks} |")
    lines.append(f"| 进行中任务 | {stats.in_progress_tasks} |")
    lines.append(f"| 待开始任务 | {stats.pending_tasks} |")
    lines.append(f"| 完成率 | {stats.completion_rate}% |")
    lines.append(f"| 今日任务 | {stats.today_tasks} |")
    lines.append(f"| 今日已完成 | {stats.today_completed} |")
    lines.append(f"")

    # Goals detail
    for goal in goals:
        plan = get_goal_with_plan(goal.id, user_id)
        lines.append(f"## {goal.title}")
        lines.append(f"")
        if goal.description:
            lines.append(f"> {goal.description}")
            lines.append(f"")
        lines.append(f"- 技能水平：{goal.skill_level}")
        lines.append(f"- 每日学习：{goal.daily_hours} 小时")
        lines.append(f"- 计划周期：{goal.duration_weeks} 周")
        lines.append(f"- 状态：{goal.status}")
        lines.append(f"- 创建时间：{goal.created_at}")
        lines.append(f"")

        if plan:
            for i, phase in enumerate(plan.phases):
                done_count = sum(1 for t in phase.tasks if t.status == "done")
                total_count = len(phase.tasks)
                lines.append(f"### 阶段 {i + 1}：{phase.title}")
                lines.append(f"")
                lines.append(f"第 {phase.week_start}-{phase.week_end} 周 | 完成 {done_count}/{total_count}")
                if phase.description:
                    lines.append(f"")
                    lines.append(f"{phase.description}")
                lines.append(f"")

                if phase.tasks:
                    for task in phase.tasks:
                        status_icon = {"done": "x", "in_progress": "~", "pending": " "}.get(task.status, " ")
                        lines.append(f"- [{status_icon}] {task.title} ({task.task_date})")
                    lines.append(f"")

        lines.append(f"---")
        lines.append(f"")

    content = "\n".join(lines)
    buffer = io.BytesIO(content.encode("utf-8"))

    return StreamingResponse(
        buffer,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="learnpilot-report-{date.today().isoformat()}.md"',
        },
    )


@router.get("/data")
def export_data(current_user: dict = Depends(get_current_user)):
    """导出 JSON 格式的全量数据备份。"""
    user_id = current_user["id"]
    db = get_db()

    goals = db.execute("SELECT * FROM goals WHERE user_id = ?", (user_id,)).fetchall()
    goal_ids = [g["id"] for g in goals]

    data = {
        "user": {"id": current_user["id"], "username": current_user["username"]},
        "exported_at": date.today().isoformat(),
        "goals": [dict(g) for g in goals],
        "phases": [],
        "tasks": [],
        "messages": [],
    }

    if goal_ids:
        placeholders = ",".join("?" * len(goal_ids))

        phases = db.execute(
            f"SELECT * FROM phases WHERE goal_id IN ({placeholders})", goal_ids
        ).fetchall()
        data["phases"] = [dict(p) for p in phases]

        tasks = db.execute(
            f"SELECT * FROM tasks WHERE goal_id IN ({placeholders})", goal_ids
        ).fetchall()
        data["tasks"] = [dict(t) for t in tasks]

        messages = db.execute(
            f"SELECT * FROM messages WHERE goal_id IN ({placeholders})", goal_ids
        ).fetchall()
        data["messages"] = [dict(m) for m in messages]

    content = json.dumps(data, ensure_ascii=False, indent=2, default=str)
    buffer = io.BytesIO(content.encode("utf-8"))

    return StreamingResponse(
        buffer,
        media_type="application/json; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="learnpilot-backup-{date.today().isoformat()}.json"',
        },
    )
