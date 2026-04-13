"use client";
import { useState, useRef, useEffect } from "react";

type Source = {
  source: string;
  content: string;
  similarity: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

export default function KnowledgeChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      abortRef.current = new AbortController();

      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 发送完整对话历史（剥离 id/sources，只保留 role/content）
          messages: [
            ...messages.map(({ role, content }) => ({ role, content })),
            { role: userMessage.role, content: userMessage.content },
          ],
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`请求失败：${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE 事件以 \n\n 分隔，逐块解析
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const block of events) {
          if (!block.trim()) continue;

          let eventType = "message";
          let eventData = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) eventType = line.slice(7);
            else if (line.startsWith("data: ")) eventData = line.slice(6);
          }

          if (eventType === "sources") {
            const sources: Source[] = JSON.parse(eventData);
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, sources } : m)),
            );
          } else if (eventType === "text") {
            const { delta } = JSON.parse(eventData) as { delta: string };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + delta } : m,
              ),
            );
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(err.message ?? "未知错误");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setIsLoading(false);
  }

  function handleRetry() {
    setError(null);
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      setInput(lastUser.content);
      setMessages((prev) => prev.filter((m) => m.id !== lastUser.id));
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {messages.length === 0 && <EmptyState onSelect={(s) => setInput(s)} />}

        {messages.map((m) => {
          const isLastAssistant =
            m.role === "assistant" && m.id === messages[messages.length - 1].id;
          if (isLoading && isLastAssistant && m.content === "") return null;

          return (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              sources={m.sources}
              isStreaming={isLoading && isLastAssistant}
            />
          );
        })}

        {isLoading &&
          messages[messages.length - 1]?.role === "assistant" &&
          messages[messages.length - 1]?.content === "" && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-6 mb-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={handleRetry}
            className="ml-3 text-xs font-medium underline underline-offset-2 hover:text-red-700"
          >
            重试
          </button>
        </div>
      )}

      {/* 输入区 */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题，按 Enter 发送..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:opacity-50 disabled:bg-gray-50 transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={handleStop}
              className="px-4 py-2.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-600 whitespace-nowrap transition-colors"
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-5 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
            >
              发送
            </button>
          )}
        </form>
        <p className="mt-2 text-xs text-gray-400 text-center">
          AI 可能出错，请注意核实重要信息
        </p>
      </div>
    </div>
  );
}

/** 将回答文本中的 [1][2] 标记渲染为上标角标 */
function renderWithCitations(content: string) {
  const parts = content.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      return (
        <sup
          key={i}
          className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-0.5 text-[10px] rounded-full bg-blue-100 text-blue-700 font-semibold mx-0.5 cursor-default"
        >
          {match[1]}
        </sup>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function MessageBubble({
  role,
  content,
  sources,
  isStreaming,
}: {
  role: string;
  content: string;
  sources?: Source[];
  isStreaming: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const isUser = role === "user";
  return (
    <div
      className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 shrink-0 mt-0.5">
          AI
        </div>
      )}
      <div
        className={`max-w-[75%] flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-7 whitespace-pre-wrap border ${
            isUser
              ? "bg-blue-50 text-blue-900 border-blue-100 rounded-tr-sm"
              : "bg-gray-50 text-gray-800 border-gray-200 rounded-tl-sm"
          }`}
        >
          {isUser ? content : renderWithCitations(content)}
          {isStreaming && (
            <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 align-text-bottom animate-pulse" />
          )}
        </div>
        {!isUser && sources && sources.length > 0 && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {sources.length} 条引用来源
          </button>
        )}
      </div>
      {modalOpen && sources && (
        <SourceModal sources={sources} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}

function SourceModal({
  sources,
  onClose,
}: {
  sources: Source[];
  onClose: () => void;
}) {
  // 点击遮罩关闭
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            引用来源
            <span className="ml-2 text-xs font-normal text-gray-400">
              共 {sources.length} 条
            </span>
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* 来源列表 */}
        <div className="overflow-y-auto p-5 space-y-3">
          {sources.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-semibold flex items-center justify-center text-[11px]">
                  {i + 1}
                </span>
                <p className="text-xs font-semibold text-gray-700 truncate flex-1">
                  {s.source}
                </p>
                <span className="flex-shrink-0 text-xs text-gray-400 tabular-nums font-medium">
                  {(s.similarity * 100).toFixed(0)}% 匹配
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                {s.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 shrink-0">
        AI
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-50 border border-gray-200 flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onSelect }: { onSelect: (s: string) => void }) {
  const suggestions = [
    "这份文档主要讲了什么？",
    "帮我总结一下核心内容",
    "有哪些注意事项？",
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-lg font-medium text-blue-700 mb-4">
        AI
      </div>
      <p className="text-base font-medium text-gray-900 mb-1">知识库已就绪</p>
      <p className="text-sm text-gray-500 mb-6">可以问我关于文档的任何问题</p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="text-sm px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 text-left"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
