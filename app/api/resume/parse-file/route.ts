import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
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

  const SUPPORTED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!SUPPORTED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "仅支持 PDF 和 Word (.docx) 格式文件" },
      { status: 400 },
    );
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
    const buffer = Buffer.from(arrayBuffer);
    let text = "";

    if (file.type === "application/pdf") {
      const { extractText } = await import("unpdf");
      const result = await extractText(new Uint8Array(arrayBuffer), {
        mergePages: true,
      });
      text = (result.text as string).trim();
    } else {
      // Word (.docx) using mammoth
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value.trim();
    }

    if (!text) {
      return NextResponse.json(
        { error: "文件内容为空或无法解析" },
        { status: 400 },
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("File parse error:", error);
    return NextResponse.json(
      { error: "文件解析失败，请确保文件未损坏" },
      { status: 500 },
    );
  }
}
