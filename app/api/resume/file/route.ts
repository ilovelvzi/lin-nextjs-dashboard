import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getResumeById } from "@/app/lib/resume-actions";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return new NextResponse("Missing id", { status: 400 });
  }

  const resume = await getResumeById(id);
  if (!resume?.original_file_url) {
    return new NextResponse("Not found", { status: 404 });
  }

  const blobResponse = await fetch(resume.original_file_url, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  });

  if (!blobResponse.ok) {
    return new NextResponse("Failed to fetch file", { status: 502 });
  }

  const contentType =
    resume.original_file_type === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return new NextResponse(blobResponse.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
