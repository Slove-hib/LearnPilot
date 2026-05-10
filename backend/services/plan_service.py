from models.schemas import GoalCreate, AgentPlan, GoalOut, PhaseOut, TaskOut, GoalWithPlan
from agents.planner import planner_agent
from database import get_db


def create_goal_with_plan(req: GoalCreate, user_id: int) -> GoalWithPlan:
    db = get_db()

    # 1. Call Planner Agent
    plan: AgentPlan = planner_agent.generate_plan(
        title=req.title,
        description=req.description,
        daily_hours=req.daily_hours,
        duration_weeks=req.duration_weeks,
        skill_level=req.skill_level,
    )

    # 2. Insert goal
    cursor = db.execute(
        "INSERT INTO goals (user_id, title, description, daily_hours, duration_weeks, skill_level) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, req.title, req.description, req.daily_hours, req.duration_weeks, req.skill_level),
    )
    goal_id = cursor.lastrowid

    # 3. Insert phases and tasks
    for phase_idx, phase in enumerate(plan.phases):
        cursor = db.execute(
            "INSERT INTO phases (goal_id, title, description, sort_order, week_start, week_end) VALUES (?, ?, ?, ?, ?, ?)",
            (goal_id, phase.title, phase.description, phase_idx, phase.week_start, phase.week_end),
        )
        phase_id = cursor.lastrowid

        for task in phase.tasks:
            db.execute(
                "INSERT INTO tasks (phase_id, goal_id, title, description, task_date, task_type, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (phase_id, goal_id, task.title, task.description, task.task_date, task.task_type, task.sort_order),
            )

    db.commit()

    # 4. Return the full plan
    return get_goal_with_plan(goal_id, user_id)


def get_all_goals(user_id: int) -> list[GoalOut]:
    db = get_db()
    rows = db.execute(
        "SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC", (user_id,)
    ).fetchall()
    return [GoalOut(**dict(r)) for r in rows]


def get_goal_with_plan(goal_id: int, user_id: int) -> GoalWithPlan | None:
    db = get_db()

    goal_row = db.execute(
        "SELECT * FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id)
    ).fetchone()
    if not goal_row:
        return None

    goal = GoalOut(**dict(goal_row))

    phase_rows = db.execute(
        "SELECT * FROM phases WHERE goal_id = ? ORDER BY sort_order", (goal_id,)
    ).fetchall()

    phases = []
    for pr in phase_rows:
        task_rows = db.execute(
            "SELECT * FROM tasks WHERE phase_id = ? ORDER BY sort_order", (pr["id"],)
        ).fetchall()
        tasks = [TaskOut(**dict(t)) for t in task_rows]
        phases.append(PhaseOut(**dict(pr), tasks=tasks))

    return GoalWithPlan(goal=goal, phases=phases)
