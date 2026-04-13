import { auth } from "@/auth";
import sql from "@/app/lib/db";

export type DashboardStats = {
  totalResumes: number;
  completedResumes: number;
  ragDocuments: number;
  ragChunks: number;
};

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [totalRes, completedRes, ragDocs, ragChunks] = await Promise.all([
    userId
      ? sql<
          { count: string }[]
        >`SELECT COUNT(*) FROM resumes WHERE user_id = ${userId}`
      : Promise.resolve([{ count: "0" }]),
    userId
      ? sql<
          { count: string }[]
        >`SELECT COUNT(*) FROM resumes WHERE user_id = ${userId} AND status = 'completed'`
      : Promise.resolve([{ count: "0" }]),
    sql<
      { count: string }[]
    >`SELECT COUNT(DISTINCT metadata->>'source') FROM documents`,
    sql<{ count: string }[]>`SELECT COUNT(*) FROM documents`,
  ]);

  return {
    totalResumes: Number(totalRes[0].count),
    completedResumes: Number(completedRes[0].count),
    ragDocuments: Number(ragDocs[0].count),
    ragChunks: Number(ragChunks[0].count),
  };
}
