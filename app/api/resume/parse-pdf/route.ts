import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractText } from "unpdf";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "未找到上传的文件" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "仅支持PDF格式文件" }, { status: 400 });
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "文件大小不能超过10MB" },
      { status: 400 },
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const { text: pages } = await extractText(new Uint8Array(arrayBuffer), {
      mergePages: true,
    });
    const text = (pages as string).trim();

    if (!text) {
      return NextResponse.json(
        { error: "PDF文件内容为空或无法解析" },
        { status: 400 },
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("PDF parse error:", error);
    return NextResponse.json(
      { error: "PDF解析失败，请确保文件未损坏" },
      { status: 500 },
    );
  }
}
