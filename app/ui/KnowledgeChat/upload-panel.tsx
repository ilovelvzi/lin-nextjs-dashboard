"use client";
import { useState, useRef, useCallback, useEffect } from "react";

type Doc = { source: string; count: number };
type ProgressEvent = {
  stage: "reading" | "chunking" | "embedding" | "done" | "error";
  message: string;
  current?: number;
  total?: number;
};

export default function UploadPanel({
  onUploadingChange,
}: {
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  async function fetchDocs() {
    try {
      const res = await fetch("/api/rag/upload");
      if (res.ok) setDocs(await res.json());
    } catch {}
  }

  async function handleFile(file: File) {
    setUploading(true);
    onUploadingChange?.(true);
    setProgress({ stage: "reading", message: "准备上传..." });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/rag/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.body) throw new Error("无响应数据");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // SSE 按行解析，保留未完整的最后一行
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as ProgressEvent;
            setProgress(event);
            if (event.stage === "done") await fetchDocs();
          } catch {}
        }
      }
    } catch (err: unknown) {
      setProgress({
        stage: "error",
        message: err instanceof Error ? err.message : "上传失败",
      });
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      // 3 秒后清除完成/错误状态
      setTimeout(() => setProgress(null), 3000);
    }
  }

  async function handleDelete(source: string) {
    await fetch(`/api/rag/upload?source=${encodeURIComponent(source)}`, {
      method: "DELETE",
    });
    setDocs((prev) => prev.filter((d) => d.source !== source));
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && !uploading) handleFile(file);
    },
    [uploading],
  );

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* 上传区域 */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          uploading
            ? "border-blue-200 bg-blue-50 cursor-default"
            : dragOver
              ? "border-blue-400 bg-blue-50"
              : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {uploading && progress ? (
          <ProgressDisplay progress={progress} />
        ) : (
          <>
            <UploadIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">
              点击或拖放文件到此处
            </p>
            <p className="text-xs text-gray-400 mt-1">
              支持 PDF、DOCX、TXT 格式，重复上传同名文件将覆盖旧数据，最大 100MB
            </p>
          </>
        )}
      </div>

      {/* 文档列表 */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          已入库文档{" "}
          <span className="text-gray-400 font-normal">({docs.length} 个)</span>
        </p>

        {docs.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">
            暂无文档，请上传 PDF / DOCX / TXT 文件
          </div>
        ) : (
          <ul className="space-y-2">
            {docs.map((doc) => {
              const ext = doc.source.split(".").pop()?.toLowerCase() ?? "";
              return (
                <li
                  key={doc.source}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileTypeBadge ext={ext} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {doc.source}
                      </p>
                      <p className="text-xs text-gray-400">
                        {doc.count} 个文本块
                      </p>
                    </div>
                  </div>
                  {confirmingDelete === doc.source ? (
                    <div className="ml-4 shrink-0 flex items-center gap-2">
                      <span className="text-xs text-gray-500">确认删除?</span>
                      <button
                        onClick={() => {
                          handleDelete(doc.source);
                          setConfirmingDelete(null);
                        }}
                        className="text-xs px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        删除
                      </button>
                      <button
                        onClick={() => setConfirmingDelete(null)}
                        className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingDelete(doc.source)}
                      title="删除"
                      className="ml-4 shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressDisplay({ progress }: { progress: ProgressEvent }) {
  const percent =
    progress.current != null && progress.total != null
      ? Math.round((progress.current / progress.total) * 100)
      : null;

  const stageLabel: Record<string, string> = {
    reading: "读取文件",
    chunking: "文本分块",
    embedding: "向量化入库",
    done: "完成",
    error: "失败",
  };

  return (
    <div className="space-y-3 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{progress.message}</span>
        {percent !== null && (
          <span className="text-gray-400 text-xs">{percent}%</span>
        )}
      </div>

      {percent !== null && (
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {percent === null &&
        progress.stage !== "done" &&
        progress.stage !== "error" && (
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full animate-pulse w-1/3" />
          </div>
        )}

      {progress.stage === "done" && (
        <p className="text-xs text-green-600 font-medium">✓ 上传成功</p>
      )}
      {progress.stage === "error" && (
        <p className="text-xs text-red-500">✗ {progress.message}</p>
      )}

      <div className="flex justify-center gap-2 text-xs text-gray-400">
        {(["reading", "chunking", "embedding", "done"] as const).map((s) => (
          <span
            key={s}
            className={`transition-colors ${
              s === progress.stage ? "text-blue-500 font-medium" : ""
            }`}
          >
            {stageLabel[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

function FileTypeBadge({ ext }: { ext: string }) {
  const style: Record<string, string> = {
    pdf: "bg-red-50 text-red-500",
    docx: "bg-blue-50 text-blue-500",
    txt: "bg-gray-100 text-gray-500",
  };
  return (
    <div
      className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
        style[ext] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {ext.toUpperCase().slice(0, 3)}
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}
