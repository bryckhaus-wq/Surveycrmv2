import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3Client } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const attachments = await prisma.attachment.findMany({
      where: { orderId: params.id },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error("Failed to fetch attachments:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const { fileName, fileType } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are required" },
        { status: 400 }
      );
    }

    const bucketName =
      process.env.MINIO_BUCKET_NAME ||
      process.env.S3_BUCKET_NAME ||
      "mjs-documents";
    const endpoint =
      process.env.MINIO_ENDPOINT ||
      process.env.S3_ENDPOINT ||
      "http://localhost:9000";

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${params.id}/${Date.now()}-${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    const fileUrl = `${endpoint}/${bucketName}/${key}`;

    const attachment = await prisma.attachment.create({
      data: {
        fileName,
        fileUrl,
        fileType,
        orderId: params.id,
        uploaderId: session.user.id || null,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ uploadUrl, attachment }, { status: 201 });
  } catch (error) {
    console.error("Failed to create attachment upload:", error);
    return NextResponse.json(
      { error: "Failed to create attachment upload" },
      { status: 500 }
    );
  }
}
