from datetime import date, datetime
from models.schemas import TaskOut, TodayTasksOut, StatsOut
from database import get_db


def _row_to_task(row) -> TaskOut:
    return TaskOut(**dict(row))


def get_today_tasks(user_id: int) -> TodayTasksOut:
    db = get_db()
    today = date.today().isoformat()
    rows = db.execute(
        "SELECT t.* FROM tasks t JOIN goals g ON t.goal_id = g.id "
        "WHERE t.task_date = ? AND g.user_id = ? ORDER BY t.sort_order",
        (today, user_id),
    ).fetchall()
    return TodayTasksOut(date=today, tasks=[_row_to_task(r) for r in rows])


def get_tasks(user_id: int, goal_id: int | None = None, task_date: str | None = None) -> list[TaskOut]:
    db = get_db()
    conditions = ["g.user_id = ?"]
    params: list = [user_id]

    if goal_id is not None:
        conditions.append("t.goal_id = ?")
        params.append(goal_id)
    if task_date is not None:
        conditions.append("t.task_date = ?")
        params.append(task_date)

    where = "WHERE " + " AND ".join(conditions)

    rows = db.execute(
        f"SELECT t.* FROM tasks t JOIN goals g ON t.goal_id = g.id {where} ORDER BY t.task_date, t.sort_order",
        params,
    ).fetchall()
    return [_row_to_task(r) for r in rows]


def update_task(task_id: int, new_status: str, user_id: int) -> TaskOut:
    db = get_db()

    row = db.execute(
        "SELECT t.* FROM tasks t JOIN goals g ON t.goal_id = g.id WHERE t.id = ? AND g.user_id = ?",
        (task_id, user_id),
    ).fetchone()
    if not row:
        raise LookupError("Task not found")

    if new_status == "done":
        completed_at = datetime.now().isoformat()
    else:
        completed_at = None

    db.execute(
        "UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?",
        (new_status, completed_at, task_id),
    )
    db.commit()

    row = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return _row_to_task(row)


def get_stats(user_id: int) -> StatsOut:
    db = get_db()
    today = date.today().isoformat()

    total_goals = db.execute("SELECT COUNT(*) FROM goals WHERE user_id = ?", (user_id,)).fetchone()[0]
    active_goals = db.execute("SELECT COUNT(*) FROM goals WHERE user_id = ? AND status = 'active'", (user_id,)).fetchone()[0]

    total_tasks = db.execute(
        "SELECT COUNT(*) FROM tasks t JOIN goals g ON t.goal_id = g.id WHERE g.user_id = ?", (user_id,)
    ).fetchone()[0]
    completed_tasks = db.execute(
        "SELECT COUNT(*) FROM tasks t JOIN goals g ON t.goal_id = g.id WHERE g.user_id = ? AND t.status = 'done'", (user_id,)
    ).fetchone()[0]
    pending_tasks = db.execute(
        "SELECT COUNT(*) FROM tasks t JOIN goals g ON t.goal_id = g.id WHERE g.user_id = ? AND t.status = 'pending'", (user_id,)
    ).fetchone()[0]
    in_progress_tasks = db.execute(
        "SELECT COUNT(*) FROM tasks t JOIN goals g ON t.goal_id = g.id WHERE g.user_id = ? AND t.status = 'in_progress'", (user_id,)
    ).fetchone()[0]

    today_tasks = db.execute(
        "SELECT COUNT(*) FROM tasks t JOIN goals g ON t.goal_id = g.id WHERE t.task_date = ? AND g.user_id = ?",
        (today, user_id),
    ).fetchone()[0]
    today_completed = db.execute(
        "SELECT COUNT(*) FROM tasks t JOIN goals g ON t.goal_id = g.id WHERE t.task_date = ? AND t.status = 'done' AND g.user_id = ?",
        (today, user_id),
    ).fetchone()[0]

    completion_rate = round(completed_tasks / total_tasks * 100, 2) if total_tasks > 0 else 0.0

    return StatsOut(
        total_goals=total_goals,
        active_goals=active_goals,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        in_progress_tasks=in_progress_tasks,
        completion_rate=completion_rate,
        today_tasks=today_tasks,
        today_completed=today_completed,
    )
