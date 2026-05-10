import client from "./client";

export interface GoalCreate {
  title: string;
  description: string;
  daily_hours: number;
  duration_weeks: number;
  skill_level: string;
}

export interface TaskOut {
  id: number;
  phase_id: number;
  goal_id: number;
  title: string;
  description: string | null;
  task_date: string;
  task_type: string;
  status: string;
  completed_at: string | null;
  sort_order: number;
}

export interface PhaseOut {
  id: number;
  goal_id: number;
  title: string;
  description: string | null;
  sort_order: number;
  week_start: number;
  week_end: number;
  tasks: TaskOut[];
}

export interface GoalOut {
  id: number;
  title: string;
  description: string | null;
  daily_hours: number;
  duration_weeks: number;
  skill_level: string;
  status: string;
  created_at: string;
}

export interface GoalWithPlan {
  goal: GoalOut;
  phases: PhaseOut[];
}

export interface AdjustmentItem {
  task_id: number;
  action: string;
  new_date: string | null;
  new_title: string | null;
  new_description: string | null;
  reason: string;
}

export interface AdjustmentResult {
  goal_id: number;
  analysis: string;
  adjustments: AdjustmentItem[];
  updated_tasks: TaskOut[];
}

export async function createGoal(data: GoalCreate): Promise<GoalWithPlan> {
  const res = await client.post("/api/goals", data);
  return res.data;
}

export async function getGoals(): Promise<GoalOut[]> {
  const res = await client.get("/api/goals");
  return res.data;
}

export async function getGoalPlan(goalId: number): Promise<GoalWithPlan> {
  const res = await client.get(`/api/goals/${goalId}/plan`);
  return res.data;
}

export async function adjustPlan(
  goalId: number,
  feedback: string
): Promise<AdjustmentResult> {
  const res = await client.post(`/api/goals/${goalId}/plan/adjust`, { feedback });
  return res.data;
}
