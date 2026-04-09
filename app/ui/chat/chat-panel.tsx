"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const assistantId = `assistant-${Date.now()}`;
    // Add an empty assistant message that will be streamed into
    setMessages([
      ...newMessages,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`请求失败: ${res.status}`);
      }

      const contentType = res.headers.get("Content-Type") || "";

      // Handle JSON error response from the API
      if (contentType.includes("application/json")) {
        const data = await res.json();
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...last,
            content: data.error || "发生未知错误",
          };
          return updated;
        });
        return;
      }

      // Handle streaming text response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("无法读取响应流");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...last,
            content: last.content + text,
          };
          return updated;
        });
      }
    } catch (error) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = {
          ...last,
          content:
            error instanceof Error
              ? `出错了: ${error.message}`
              : "请求出错，请稍后重试",
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-lg font-medium">知识库问答助手</p>
              <p className="mt-1 text-sm">
                输入问题，我会根据知识库内容为你解答
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx("flex", {
              "justify-end": msg.role === "user",
              "justify-start": msg.role === "assistant",
            })}
          >
            <div
              className={clsx("max-w-[75%] rounded-lg px-4 py-2 text-sm", {
                "bg-blue-600 text-white": msg.role === "user",
                "bg-gray-100 text-gray-900": msg.role === "assistant",
              })}
            >
              <div className="whitespace-pre-wrap break-words">
                {msg.content}
                {msg.role === "assistant" &&
                  msg.content === "" &&
                  isLoading && (
                    <span className="inline-block animate-pulse">▍</span>
                  )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="输入你的问题..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            style={{ maxHeight: "120px" }}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={clsx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
              {
                "bg-blue-600 text-white hover:bg-blue-500":
                  !isLoading && input.trim(),
                "bg-gray-200 text-gray-400 cursor-not-allowed":
                  isLoading || !input.trim(),
              },
            )}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
