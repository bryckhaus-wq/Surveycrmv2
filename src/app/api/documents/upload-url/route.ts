import { NextResponse } from "next/server";
import { getPresignedUploadUrl } from "@/lib/s3";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileName, fileType, folder } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are required" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = folder
      ? `${folder}/${timestamp}-${cleanFileName}`
      : `uploads/${timestamp}-${cleanFileName}`;

    const uploadUrl = await getPresignedUploadUrl(key, fileType);

    return NextResponse.json({
      uploadUrl,
      s3Key: key,
    });
  } catch (error) {
    console.error("Failed to generate upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned upload URL" },
      { status: 500 }
    );
  }
}
