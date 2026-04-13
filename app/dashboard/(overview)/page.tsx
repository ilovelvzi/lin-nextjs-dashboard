import CardWrapper from "@/app/ui/dashboard/cards";
import { lusitana } from "@/app/ui/fonts";
import { Suspense } from "react";
import { CardsSkeleton } from "@/app/ui/skeletons";
import {
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { auth } from "@/auth";

export default async function Page() {
  const session = await auth();
  const name = session?.user?.name ?? "你";

  return (
    <main>
      <h1 className={`${lusitana.className} mb-1 text-xl md:text-2xl`}>
        工作台
      </h1>
      <p className="mb-6 text-sm text-gray-500">你好，{name}，今天想做什么？</p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<CardsSkeleton />}>
          <CardWrapper />
        </Suspense>
      </div>

      <h2 className={`${lusitana.className} mt-8 mb-4 text-lg`}>快速入口</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/resume"
          className="group flex items-center justify-between rounded-xl bg-white p-5 shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">简历优化</p>
              <p className="text-xs text-gray-500 mt-0.5">
                上传简历，AI 分析与优化建议
              </p>
            </div>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
        </Link>

        <Link
          href="/dashboard/KnowledgeChat"
          className="group flex items-center justify-between rounded-xl bg-white p-5 shadow-sm border border-gray-100 hover:border-purple-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">知识库问答</p>
              <p className="text-xs text-gray-500 mt-0.5">
                上传文档，基于内容智能问答
              </p>
            </div>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
        </Link>
      </div>
    </main>
  );
}
