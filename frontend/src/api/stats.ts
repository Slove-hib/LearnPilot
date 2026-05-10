import client from "./client";

export interface StatsOverview {
  total_goals: number;
  active_goals: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completion_rate: number;
  today_tasks: number;
  today_completed: number;
}

export async function getOverviewStats(): Promise<StatsOverview> {
  const res = await client.get("/api/stats/overview");
  return res.data;
}

export async function getProgressAnalysis(): Promise<string> {
  const res = await client.get("/api/stats/analysis");
  return res.data.analysis;
}
