"use client";
import { useState } from "react";
import { lusitana } from "@/app/ui/fonts";
import ChatPanel from "@/app/ui/KnowledgeChat/chat-panel";
import UploadPanel from "@/app/ui/KnowledgeChat/upload-panel";

type Tab = "chat" | "upload";

export default function ChatPage() {
  const [tab, setTab] = useState<Tab>("chat");
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="flex h-full flex-col">
      {/* 标题行 + Tab 切换 */}
      <div className="flex items-center justify-between mb-3">
        <h1 className={`${lusitana.className} text-2xl`}>知识库问答</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 text-sm">
          <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
            问答
          </TabButton>
          <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>
            <span className="flex items-center gap-1.5">
              管理知识库
              {isUploading && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              )}
            </span>
          </TabButton>
        </div>
      </div>

      {/* 两个面板始终挂载，切 Tab 只切换可见性，防止上传任务中断 */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden relative">
        <div className={`absolute inset-0 ${tab === "chat" ? "" : "hidden"}`}>
          <ChatPanel />
        </div>
        <div className={`absolute inset-0 ${tab === "upload" ? "" : "hidden"}`}>
          <UploadPanel onUploadingChange={setIsUploading} />
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md transition-colors ${
        active
          ? "bg-white shadow-sm font-medium text-gray-900"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
