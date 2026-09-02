import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileName, s3Key, mimeType, docType, quoteId, orderId } = body;

    if (!fileName || !s3Key || !mimeType || !docType) {
      return NextResponse.json(
        { error: "Missing required document fields" },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        fileName,
        s3Key,
        mimeType,
        docType,
        quoteId: quoteId || null,
        orderId: orderId || null,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Failed to create document record:", error);
    return NextResponse.json(
      { error: "Failed to create document record" },
      { status: 500 }
    );
  }
}
