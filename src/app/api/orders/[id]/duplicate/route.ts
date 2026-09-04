import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "@/lib/s3";
import { randomUUID } from "crypto";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = params;

    // 1. Fetch the original Order (including documents)
    const originalOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        documents: true,
      },
    });

    if (!originalOrder) {
      return NextResponse.json(
        { error: "Original order not found" },
        { status: 404 }
      );
    }

    // 2. Number Parsing for new unique orderNumber
    let newOrderNumber = `${originalOrder.orderNumber}-1`;

    // Match a hyphen followed by exactly 1 or 2 digits at the end of the string.
    // This ignores base sequences (e.g., -003) but matches duplication suffixes (e.g., -1, -2).
    const match = originalOrder.orderNumber.match(/-(\d{1,2})$/);

    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      newOrderNumber = originalOrder.orderNumber.replace(/-\d{1,2}$/, `-${nextNum}`);
    }

    // Ensure collision avoidance
    let candidateNumber = newOrderNumber;
    let counter = match ? parseInt(match[1], 10) + 1 : 1;
    const baseOrderNumber = originalOrder.orderNumber.replace(/-\d{1,2}$/, "");
    while (
      await prisma.order.findUnique({
        where: { orderNumber: candidateNumber },
        select: { id: true },
      })
    ) {
      counter++;
      candidateNumber = `${baseOrderNumber}-${counter}`;
    }
    newOrderNumber = candidateNumber;

    // 3. Create the new Order in the database (status = NEW, reset deposit/final paid)
    const newOrder = await prisma.order.create({
      data: {
        orderNumber: newOrderNumber,
        clientId: originalOrder.clientId,
        clientName: originalOrder.clientName,
        orderByName: originalOrder.orderByName,
        clientEmail: originalOrder.clientEmail,
        clientPhone: originalOrder.clientPhone,
        address: originalOrder.address,
        city: originalOrder.city,
        state: originalOrder.state,
        zip: originalOrder.zip,
        surveyTypeId: originalOrder.surveyTypeId,
        assignedUserId: originalOrder.assignedUserId,
        marketerId: originalOrder.marketerId,
        spokeId: originalOrder.spokeId,
        status: "NEW",
        fieldDueDate: originalOrder.fieldDueDate,
        fieldNotes: originalOrder.fieldNotes,
        clientDueDate: originalOrder.clientDueDate,
        internalDueDate: originalOrder.internalDueDate,
        closingDate: originalOrder.closingDate,
        scheduledDate: originalOrder.scheduledDate,
        county: originalOrder.county,
        taxParcelId: originalOrder.taxParcelId,
        lot: originalOrder.lot,
        block: originalOrder.block,
        subdivision: originalOrder.subdivision,
        orderedBy: originalOrder.orderedBy,
        surveyTypeCustom: originalOrder.surveyTypeCustom,
        specialInstructions: originalOrder.specialInstructions,
        internalDraftingNotes: originalOrder.internalDraftingNotes,
        isFhaVaLoan: originalOrder.isFhaVaLoan,
        crewComments: originalOrder.crewComments,
        pointsOfInterest: originalOrder.pointsOfInterest,
        surveyPrice: originalOrder.surveyPrice,
        miscAmt: originalOrder.miscAmt,
        miscAmtDescription: originalOrder.miscAmtDescription,
        discountAmt: originalOrder.discountAmt,
        depositPaid: 0,
        finalPaymentReceived: 0,
        taxRate: originalOrder.taxRate,
        researcherId: originalOrder.researcherId,
        fieldCrewId: originalOrder.fieldCrewId,
        drafterId: originalOrder.drafterId,
        checkerId: originalOrder.checkerId,
        signingSurveyorId: originalOrder.signingSurveyorId,
        latitude: originalOrder.latitude,
        longitude: originalOrder.longitude,
      },
    });

    // 4. Duplicate Files with AWS SDK CopyObjectCommand
    if (originalOrder.documents && originalOrder.documents.length > 0) {
      for (const doc of originalOrder.documents) {
        const fileExt = doc.fileName.includes(".")
          ? `.${doc.fileName.split(".").pop()}`
          : "";
        const uniqueKey = `orders/${newOrder.id}/${randomUUID()}${fileExt}`;

        try {
          // AWS S3 CopySource syntax: bucket/sourceKey
          const copySource = `${bucketName}/${doc.s3Key}`;
          await s3Client.send(
            new CopyObjectCommand({
              Bucket: bucketName,
              CopySource: encodeURI(copySource),
              Key: uniqueKey,
            })
          );

          await prisma.document.create({
            data: {
              fileName: doc.fileName,
              s3Key: uniqueKey,
              mimeType: doc.mimeType,
              docType: doc.docType,
              orderId: newOrder.id,
            },
          });
        } catch (copyError) {
          console.error(`Failed to copy S3 document ${doc.fileName}:`, copyError);
          // Still create document record pointing to new key if desired or fallback
        }
      }
    }

    // 5. Record audit trail
    if (session.user?.id) {
      await logAction(
        "ORDER",
        newOrder.id,
        "CREATED",
        `Order duplicated from #${originalOrder.orderNumber}`,
        session.user.id
      );
    }

    return NextResponse.json({
      success: true,
      newOrderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
    });
  } catch (error: any) {
    console.error("Failed to duplicate order:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to duplicate order" },
      { status: 500 }
    );
  }
}
