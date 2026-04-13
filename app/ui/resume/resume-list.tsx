"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";
import type { Resume } from "@/app/lib/definitions";
import ResumeCard from "./resume-card";
import clsx from "clsx";

type StatusFilter = "all" | Resume["status"];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "completed", label: "已完成" },
  { value: "analyzing", label: "分析中" },
  { value: "pending", label: "待分析" },
  { value: "failed", label: "失败" },
];

export default function ResumeList({ resumes }: { resumes: Resume[] }) {
  const [filter, setFilter] = useState<StatusFilter>("all");

  if (resumes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 text-center">
        <p className="mb-2 text-lg font-medium text-gray-500">还没有简历</p>
        <p className="mb-6 text-sm text-gray-400">
          上传您的简历，让AI帮助您优化
        </p>
        <Link
          href="/dashboard/resume/upload"
          className="flex items-center gap-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          上传新简历
        </Link>
      </div>
    );
  }

  const visible =
    filter === "all" ? resumes : resumes.filter((r) => r.status === filter);

  // Only show filters that have at least one item (plus "all")
  const activeStatuses = new Set(resumes.map((r) => r.status));
  const availableFilters = STATUS_OPTIONS.filter(
    (o) => o.value === "all" || activeStatuses.has(o.value as Resume["status"]),
  );

  return (
    <div className="space-y-4">
      {/* Status filter bar */}
      {availableFilters.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {availableFilters.map((opt) => {
            const count =
              opt.value === "all"
                ? resumes.length
                : resumes.filter((r) => r.status === opt.value).length;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filter === opt.value
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                {opt.label}
                <span
                  className={clsx(
                    "rounded-full px-1.5 py-0.5 text-xs",
                    filter === opt.value
                      ? "bg-blue-400 text-white"
                      : "bg-white text-gray-500",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty filtered state */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-10 text-center">
          <p className="text-sm text-gray-400">没有符合条件的简历</p>
          <button
            onClick={() => setFilter("all")}
            className="mt-3 text-xs text-blue-500 hover:text-blue-400"
          >
            查看全部
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      )}
    </div>
  );
}
