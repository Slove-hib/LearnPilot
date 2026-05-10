import client from "./client";

export interface ChatReply {
  goal_id: number;
  task_id: number | null;
  reply: string;
  message_id: number;
}

export interface MessageOut {
  id: number;
  role: string;
  content: string;
  agent_type: string | null;
  created_at: string;
}

export interface ChatHistory {
  goal_id: number;
  messages: MessageOut[];
}

export async function sendChatMessage(data: {
  goal_id: number;
  task_id?: number;
  message: string;
}): Promise<ChatReply> {
  const res = await client.post("/api/chat", data);
  return res.data;
}

export async function getChatHistory(
  goalId: number,
  limit = 20
): Promise<ChatHistory> {
  const res = await client.get("/api/chat/history", {
    params: { goal_id: goalId, limit },
  });
  return res.data;
}

export async function sendChatMessageStream(
  data: { goal_id: number; task_id?: number; message: string },
  onChunk: (content: string) => void,
  onDone: (messageId: number) => void,
  onError: (error: string) => void,
): Promise<void> {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "请求失败" }));
    onError(err.detail || "请求失败");
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload);
        if (parsed.error) {
          onError(parsed.error);
          return;
        }
        if (parsed.content) {
          onChunk(parsed.content);
        }
        if (parsed.message_id) {
          onDone(parsed.message_id);
        }
      } catch {
        // skip malformed lines
      }
    }
  }
}
