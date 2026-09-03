import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: process.env.MINIO_ENDPOINT || process.env.S3_ENDPOINT || "http://127.0.0.1:9000",
  credentials: {
    accessKeyId: (process.env.MINIO_ACCESS_KEY || process.env.S3_ACCESS_KEY_ID || "minioadmin")!,
    secretAccessKey: (process.env.MINIO_SECRET_KEY || process.env.S3_SECRET_ACCESS_KEY || "minioadmin")!,
  },
  forcePathStyle: true, // Crucial for MinIO
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const document = await db.document.findUnique({ where: { id: params.id } });
    if (!document) return new NextResponse("Not Found", { status: 404 });

    const key = document.s3Key || (document as any).key;
    const command = new GetObjectCommand({
      Bucket: process.env.MINIO_BUCKET_NAME || process.env.S3_BUCKET_NAME || "mjs-documents",
      Key: key,
    });

    const s3Response = await s3.send(command);
    const fileBytes = await s3Response.Body?.transformToByteArray();

    if (!fileBytes) {
      return new NextResponse("File content not found", { status: 404 });
    }

    return new NextResponse(Buffer.from(fileBytes), {
      headers: {
        "Content-Type": s3Response.ContentType || document.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${document.fileName}"`,
      },
    });
  } catch (error) {
    console.error("[DOWNLOAD_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
