import {
  DocumentTextIcon,
  CheckCircleIcon,
  BookOpenIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline";
import { lusitana } from "@/app/ui/fonts";
import { fetchDashboardStats } from "@/app/lib/data";

export default async function CardWrapper() {
  const stats = await fetchDashboardStats();

  return (
    <>
      <StatCard
        title="简历总数"
        value={stats.totalResumes}
        icon={DocumentTextIcon}
      />
      <StatCard
        title="已完成优化"
        value={stats.completedResumes}
        icon={CheckCircleIcon}
      />
      <StatCard
        title="知识库文档"
        value={stats.ragDocuments}
        icon={BookOpenIcon}
      />
      <StatCard
        title="知识库文本块"
        value={stats.ragChunks}
        icon={CircleStackIcon}
      />
    </>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-2 shadow-sm">
      <div className="flex p-4">
        <Icon className="h-5 w-5 text-gray-700" />
        <h3 className="ml-2 text-sm font-medium">{title}</h3>
      </div>
      <p
        className={`${lusitana.className} truncate rounded-xl bg-white px-4 py-8 text-center text-2xl`}
      >
        {value}
      </p>
    </div>
  );
}
