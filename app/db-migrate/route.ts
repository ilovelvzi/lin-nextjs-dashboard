import sql from "@/app/lib/db";

export async function GET() {
  try {
    // 删除旧的示例数据表（invoices 依赖 customers，需先删 invoices）
    await sql`DROP TABLE IF EXISTS invoices CASCADE`;
    await sql`DROP TABLE IF EXISTS customers CASCADE`;
    await sql`DROP TABLE IF EXISTS revenue CASCADE`;

    return Response.json({
      message: "清理完成：已删除 invoices、customers、revenue 表",
    });
  } catch (error) {
    console.error("Migration error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
