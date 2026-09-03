import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { s3Client, bucketName } from "@/lib/s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete object from S3 / MinIO storage
    try {
      if (document.s3Key) {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: document.s3Key,
          })
        );
      }
    } catch (storageError) {
      console.error("Failed to delete object from MinIO/S3:", storageError);
      // Continue to delete from DB or log error
    }

    // Delete document record from database
    await prisma.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true, message: "Document deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete document" },
      { status: 500 }
    );
  }
}
