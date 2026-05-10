import client from "./client";
import type { TaskOut } from "./goals";

export type TaskStatus = "pending" | "in_progress" | "done";

export interface TodayTasks {
  date: string;
  tasks: TaskOut[];
}

export async function getTodayTasks(): Promise<TodayTasks> {
  const res = await client.get("/api/tasks/today");
  return res.data;
}

export async function getTasks(params: {
  goal_id?: number;
  date?: string;
}): Promise<TaskOut[]> {
  const res = await client.get("/api/tasks", { params });
  return res.data;
}

export async function updateTaskStatus(
  taskId: number,
  status: TaskStatus
): Promise<TaskOut> {
  const res = await client.patch(`/api/tasks/${taskId}`, { status });
  return res.data;
}
