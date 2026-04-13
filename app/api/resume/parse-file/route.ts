import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { put } from "@vercel/blob";

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
    // Buffer.from(Uint8Array) copies data; Buffer.from(ArrayBuffer) shares it.
    // The WASM-based PDF extractor (unpdf) detaches the original ArrayBuffer,
    // so we create an independent copy here to avoid "detached ArrayBuffer" errors
    // in subsequent operations (mammoth, Vercel Blob upload via fetch/undici).
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    const fileType = file.type === "application/pdf" ? "pdf" : "docx";
    const originalName = (file as File).name ?? `resume.${fileType}`;
    let text = "";
    let originalHtml: string | undefined;

    if (fileType === "pdf") {
      const { extractText } = await import("unpdf");
      const result = await extractText(new Uint8Array(buffer), {
        mergePages: true,
      });
      text = (result.text as string).trim();
    } else {
      const mammoth = await import("mammoth");
      const [rawResult, htmlResult] = await Promise.all([
        mammoth.extractRawText({ buffer }),
        mammoth.convertToHtml({ buffer }),
      ]);
      text = rawResult.value.trim();
      originalHtml = htmlResult.value;
    }

    if (!text) {
      return NextResponse.json(
        { error: "文件内容为空或无法解析" },
        { status: 400 },
      );
    }

    // Upload original file to Vercel Blob
    const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const blobPath = `resumes/${session.user.id}/${Date.now()}_${safeName}`;
    const blob = await put(blobPath, buffer, {
      access: "private",
      contentType: file.type,
    });

    return NextResponse.json({
      text,
      fileUrl: blob.url,
      fileType,
      ...(originalHtml !== undefined ? { originalHtml } : {}),
    });
  } catch (error) {
    console.error("File parse error:", error);
    return NextResponse.json(
      { error: "文件解析失败，请确保文件未损坏" },
      { status: 500 },
    );
  }
}
