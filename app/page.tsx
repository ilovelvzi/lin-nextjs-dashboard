import {
  ArrowRightIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { lusitana } from "@/app/ui/fonts";

const features = [
  {
    icon: DocumentTextIcon,
    title: "简历优化",
    desc: "上传 PDF/DOCX，AI 深度分析并给出针对性优化建议",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: "知识库问答",
    desc: "上传文档构建私有知识库，基于内容进行精准问答",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-16 md:py-24">
        {/* 标题区 */}
        <div className="mb-4 flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
          <SparklesIcon className="h-4 w-4" />
          AI 驱动的个人效率工具
        </div>
        <h1
          className={`${lusitana.className} mb-4 text-center text-3xl font-bold text-gray-900 md:text-5xl`}
        >
          你的专属工具台
        </h1>
        <p className="mb-10 max-w-md text-center text-gray-500 md:text-lg">
          集简历优化与知识库问答于一体，让 AI 成为你的高效助理。
        </p>

        {/* 功能卡片 */}
        <div className="mb-10 grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className={`w-fit rounded-xl ${bg} p-3`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <p className="font-semibold text-gray-900">{title}</p>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>

        {/* 登录按钮 */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-500 md:text-base"
        >
          立即进入 <ArrowRightIcon className="h-4 w-4 md:h-5 md:w-5" />
        </Link>
    </main>
  );
}
