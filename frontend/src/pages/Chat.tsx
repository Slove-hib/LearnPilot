import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MessageCircle,
  Send,
  Bot,
  User,
  BookOpen,
  Loader2,
  AlertCircle,
  History,
} from "lucide-react";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { sendChatMessageStream, getChatHistory } from "../api/chat";
import type { MessageOut } from "../api/chat";

interface DisplayMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export default function Chat() {
  const [searchParams] = useSearchParams();

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Context inputs — initialized from URL params
  const [goalIdInput, setGoalIdInput] = useState(() => searchParams.get("goal_id") || "1");
  const [taskIdInput, setTaskIdInput] = useState(() => searchParams.get("task_id") || "");
  const [goalId, setGoalId] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, streaming]);

  // Auto-load history if goal_id is in URL
  useEffect(() => {
    const urlGoalId = searchParams.get("goal_id");
    if (urlGoalId && Number(urlGoalId) > 0) {
      setGoalIdInput(urlGoalId);
      const urlTaskId = searchParams.get("task_id");
      if (urlTaskId) {
        setTaskIdInput(urlTaskId);
      }
      // Auto-load history
      handleLoadHistoryFromParams(Number(urlGoalId), urlTaskId ? Number(urlTaskId) : null);
    }
  }, []); // only on mount

  async function handleLoadHistoryFromParams(gid: number, tid: number | null) {
    setLoading(true);
    setError(null);
    try {
      const res = await getChatHistory(gid);
      const loaded: DisplayMessage[] = res.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        created_at: m.created_at,
      }));
      setMessages(loaded);
      setGoalId(gid);
      setTaskId(tid && tid > 0 ? tid : null);
      setHistoryLoaded(true);
    } catch (err: any) {
      const detail =
        err.response?.data?.detail || err.message || "加载历史记录失败。";
      setError(detail);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadHistory() {
    const gid = Number(goalIdInput);
    if (!gid || gid <= 0) {
      setError("请输入有效的目标 ID。");
      return;
    }
    const tid = taskIdInput.trim() ? Number(taskIdInput.trim()) : null;
    await handleLoadHistoryFromParams(gid, tid);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;

    const gid = goalId ?? Number(goalIdInput);
    if (!gid || gid <= 0) {
      setError("请输入有效的目标 ID 并先加载历史记录。");
      return;
    }

    // Optimistic user message
    const userMsg: DisplayMessage = {
      id: Date.now(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setError(null);

    // Placeholder for assistant reply
    const assistantId = Date.now() + 1;
    const assistantMsg: DisplayMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, assistantMsg]);

    const payload: { goal_id: number; task_id?: number; message: string } = {
      goal_id: gid,
      message: text,
    };
    if (taskId) {
      payload.task_id = taskId;
    }

    await sendChatMessageStream(
      payload,
      // onChunk
      (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m,
          ),
        );
      },
      // onDone
      (messageId) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, id: messageId } : m,
          ),
        );
        setGoalId(gid);
        setHistoryLoaded(true);
        setStreaming(false);
      },
      // onError
      (errMsg) => {
        setError(errMsg);
        // Remove empty assistant message and optimistic user message
        setMessages((prev) =>
          prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id),
        );
        setStreaming(false);
      },
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-11rem)]">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle size={24} />
          AI 辅导老师
        </h2>
        <p className="text-gray-500 mt-1">
          针对你的学习任务提问，获取个性化辅导。
        </p>
      </div>

      {/* Context inputs */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium">目标 ID：</label>
          <input
            type="number"
            value={goalIdInput}
            onChange={(e) => setGoalIdInput(e.target.value)}
            min={1}
            className="w-20 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium">
            任务 ID：
            <span className="font-normal text-gray-400 ml-1">（可选）</span>
          </label>
          <input
            type="number"
            value={taskIdInput}
            onChange={(e) => setTaskIdInput(e.target.value)}
            min={1}
            placeholder="—"
            className="w-20 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <button
          onClick={handleLoadHistory}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <History size={14} />
          加载历史
        </button>
        {historyLoaded && goalId && (
          <span className="text-xs text-gray-400">
            正在与目标 #{goalId} 对话
            {taskId ? ` / 任务 #${taskId}` : ""}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {!historyLoaded && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <BookOpen size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-400 mb-1">
              输入目标 ID 并点击"加载历史"开始对话。
            </p>
            <p className="text-xs text-gray-300">
              辅导 Agent 将根据你的学习上下文进行答疑。
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <Bot size={16} className="text-indigo-600" />
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-md whitespace-pre-wrap"
                  : "bg-gray-100 text-gray-800 rounded-bl-md prose prose-sm prose-p:my-1 prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-code:text-indigo-600 prose-code:before:content-none prose-code:after:content-none"
              }`}
            >
              {msg.role === "assistant" ? (
                msg.content ? (
                  <Markdown rehypePlugins={[rehypeHighlight]}>{msg.content}</Markdown>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-gray-400">
                    <Loader2 size={14} className="animate-spin" />
                    思考中...
                  </span>
                )
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && !streaming && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <Bot size={16} className="text-indigo-600" />
            </div>
            <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm text-gray-500 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              辅导 Agent 正在思考...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-4 py-2 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={
            historyLoaded
              ? "输入你的学习问题..."
              : "请先加载历史记录..."
          }
          disabled={!historyLoaded || streaming}
          className="flex-1 outline-none text-sm disabled:text-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading || streaming || !historyLoaded}
          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
