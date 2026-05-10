from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


# ---------- Request ----------

class GoalCreate(BaseModel):
    title: str
    description: str = ""
    daily_hours: float
    duration_weeks: int
    skill_level: str  # beginner / intermediate / advanced


# ---------- DB Row Models ----------

class TaskOut(BaseModel):
    id: int
    phase_id: int
    goal_id: int
    title: str
    description: Optional[str] = None
    task_date: date
    task_type: str
    status: str
    completed_at: Optional[datetime] = None
    sort_order: int


class PhaseOut(BaseModel):
    id: int
    goal_id: int
    title: str
    description: Optional[str] = None
    sort_order: int
    week_start: int
    week_end: int
    tasks: list[TaskOut] = []


class GoalOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    daily_hours: float
    duration_weeks: int
    skill_level: str
    status: str
    created_at: str


class GoalWithPlan(BaseModel):
    goal: GoalOut
    phases: list[PhaseOut]


# ---------- Agent Output ----------

class AgentTask(BaseModel):
    title: str
    description: str = ""
    task_date: str
    task_type: str = "learn"
    sort_order: int


class AgentPhase(BaseModel):
    title: str
    description: str = ""
    week_start: int
    week_end: int
    tasks: list[AgentTask]


class AgentPlan(BaseModel):
    phases: list[AgentPhase]


# ---------- Task Update ----------

class TaskUpdate(BaseModel):
    status: str  # pending / in_progress / done


class TodayTasksOut(BaseModel):
    date: str
    tasks: list[TaskOut]


# ---------- Stats ----------

class StatsOut(BaseModel):
    total_goals: int
    active_goals: int
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    in_progress_tasks: int
    completion_rate: float
    today_tasks: int
    today_completed: int


# ---------- Adjuster ----------

class AdjustRequest(BaseModel):
    feedback: str


class AdjustmentItem(BaseModel):
    task_id: int
    action: str  # reschedule / update / keep
    new_date: Optional[str] = None
    new_title: Optional[str] = None
    new_description: Optional[str] = None
    reason: str = ""


class AgentAdjustment(BaseModel):
    analysis: str
    adjustments: list[AdjustmentItem]


class AdjustmentResultOut(BaseModel):
    goal_id: int
    analysis: str
    adjustments: list[AdjustmentItem]
    updated_tasks: list[TaskOut]


# ---------- Chat ----------

class ChatRequest(BaseModel):
    goal_id: int
    task_id: Optional[int] = None
    message: str


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    agent_type: Optional[str] = None
    created_at: str


class ChatReplyOut(BaseModel):
    goal_id: int
    task_id: Optional[int] = None
    reply: str
    message_id: int


class ChatHistoryOut(BaseModel):
    goal_id: int
    messages: list[MessageOut]
