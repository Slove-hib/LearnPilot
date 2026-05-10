import logging
from datetime import date
from models.schemas import (
    AdjustmentResultOut,
    AdjustmentItem,
    TaskOut,
    GoalOut,
    AgentAdjustment,
)
from agents.adjuster import adjuster_agent
from database import get_db

logger = logging.getLogger(__name__)


def _row_to_task(row) -> TaskOut:
    return TaskOut(**dict(row))


def _build_goal_info(goal_row) -> dict:
    return {
        "title": goal_row["title"],
        "description": goal_row["description"],
        "daily_hours": goal_row["daily_hours"],
        "duration_weeks": goal_row["duration_weeks"],
        "skill_level": goal_row["skill_level"],
    }


def _build_stats(goal_id: int) -> dict:
    db = get_db()
    today = date.today().isoformat()

    total = db.execute("SELECT COUNT(*) FROM tasks WHERE goal_id = ?", (goal_id,)).fetchone()[0]
    completed = db.execute(
        "SELECT COUNT(*) FROM tasks WHERE goal_id = ? AND status = 'done'", (goal_id,)
    ).fetchone()[0]
    pending = db.execute(
        "SELECT COUNT(*) FROM tasks WHERE goal_id = ? AND status = 'pending'", (goal_id,)
    ).fetchone()[0]
    in_progress = db.execute(
        "SELECT COUNT(*) FROM tasks WHERE goal_id = ? AND status = 'in_progress'", (goal_id,)
    ).fetchone()[0]
    overdue = db.execute(
        "SELECT COUNT(*) FROM tasks WHERE goal_id = ? AND status != 'done' AND task_date < ?",
        (goal_id, today),
    ).fetchone()[0]

    rate = round(completed / total * 100, 2) if total > 0 else 0.0

    return {
        "total_tasks": total,
        "completed_tasks": completed,
        "pending_tasks": pending,
        "in_progress_tasks": in_progress,
        "completion_rate": rate,
        "overdue_tasks": overdue,
    }


def _build_pending_tasks(goal_id: int) -> list[dict]:
    db = get_db()
    rows = db.execute(
        "SELECT id, title, description, task_date, task_type, status "
        "FROM tasks WHERE goal_id = ? AND status != 'done' ORDER BY task_date, sort_order",
        (goal_id,),
    ).fetchall()
    return [
        {
            "task_id": r["id"],
            "title": r["title"],
            "description": r["description"],
            "task_date": r["task_date"],
            "task_type": r["task_type"],
            "status": r["status"],
        }
        for r in rows
    ]


def _apply_adjustments(goal_id: int, adjustments: list[AdjustmentItem]) -> list[TaskOut]:
    db = get_db()
    updated = []

    # Build a set of valid task IDs (not done)
    valid_rows = db.execute(
        "SELECT id FROM tasks WHERE goal_id = ? AND status != 'done'", (goal_id,)
    ).fetchall()
    valid_ids = {r["id"] for r in valid_rows}

    for adj in adjustments:
        if adj.task_id not in valid_ids:
            logger.warning("Skipping adjustment for task_id=%d: not found or already done", adj.task_id)
            continue

        if adj.action == "keep":
            continue
        elif adj.action == "reschedule":
            if not adj.new_date:
                logger.warning("Skipping reschedule for task_id=%d: no new_date", adj.task_id)
                continue
            db.execute(
                "UPDATE tasks SET task_date = ? WHERE id = ?",
                (adj.new_date, adj.task_id),
            )
        elif adj.action == "update":
            if adj.new_title:
                db.execute(
                    "UPDATE tasks SET title = ? WHERE id = ?",
                    (adj.new_title, adj.task_id),
                )
            if adj.new_description:
                db.execute(
                    "UPDATE tasks SET description = ? WHERE id = ?",
                    (adj.new_description, adj.task_id),
                )
        else:
            logger.warning("Unknown action '%s' for task_id=%d", adj.action, adj.task_id)
            continue

    db.commit()

    # Return all updated tasks
    for adj in adjustments:
        if adj.action == "keep":
            continue
        if adj.task_id not in valid_ids:
            continue
        row = db.execute("SELECT * FROM tasks WHERE id = ?", (adj.task_id,)).fetchone()
        if row:
            updated.append(_row_to_task(row))

    return updated


def adjust_plan(goal_id: int, feedback: str, user_id: int) -> AdjustmentResultOut:
    db = get_db()

    # 1. Validate goal exists and belongs to user
    goal_row = db.execute(
        "SELECT * FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id)
    ).fetchone()
    if not goal_row:
        raise LookupError("Goal not found")

    # 2. Build inputs for agent
    goal_info = _build_goal_info(goal_row)
    stats = _build_stats(goal_id)
    pending_tasks = _build_pending_tasks(goal_id)

    if not pending_tasks:
        return AdjustmentResultOut(
            goal_id=goal_id,
            analysis="All tasks are already completed. No adjustments needed.",
            adjustments=[],
            updated_tasks=[],
        )

    # 3. Call Adjuster Agent
    result: AgentAdjustment = adjuster_agent.adjust(
        goal_info=goal_info,
        stats=stats,
        pending_tasks=pending_tasks,
        feedback=feedback,
    )

    # 4. Apply adjustments to DB
    updated_tasks = _apply_adjustments(goal_id, result.adjustments)

    return AdjustmentResultOut(
        goal_id=goal_id,
        analysis=result.analysis,
        adjustments=result.adjustments,
        updated_tasks=updated_tasks,
    )
