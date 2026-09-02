import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasAdminAccess } from "@/lib/rbac";
import { s3Client, bucketName } from "@/lib/s3";
import { PutBucketCorsCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!hasAdminAccess(session.user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const params = {
      Bucket: process.env.MINIO_BUCKET_NAME || bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["PUT", "POST", "GET", "DELETE", "HEAD"],
            AllowedOrigins: ["https://sls.bryckhouse.com", "http://localhost:3000"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    };

    await s3Client.send(new PutBucketCorsCommand(params));

    return NextResponse.json({
      message: "CORS policy successfully applied to bucket",
    });
  } catch (error) {
    console.error("Failed to apply CORS policy:", error);
    return NextResponse.json(
      { error: "Failed to apply CORS policy to bucket" },
      { status: 500 }
    );
  }
}
