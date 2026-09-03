import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl } from "@/lib/s3";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const downloadUrl = await getPresignedDownloadUrl(
      document.s3Key,
      3600,
      document.fileName
    );

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");
    const acceptHeader = req.headers.get("accept") || "";

    if (
      format === "json" ||
      (acceptHeader.includes("application/json") &&
        !acceptHeader.includes("text/html"))
    ) {
      return NextResponse.json({
        downloadUrl,
        fileName: document.fileName,
        mimeType: document.mimeType,
        docType: document.docType,
      });
    }

    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error("Failed to generate download URL:", error);
    return NextResponse.json(
      { error: "Failed to get download URL" },
      { status: 500 }
    );
  }
}
