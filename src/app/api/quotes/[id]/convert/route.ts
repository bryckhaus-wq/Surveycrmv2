import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateNextNumber } from "@/lib/sequence";
import { logAction } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        convertedOrder: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (quote.convertedOrder) {
      return NextResponse.json(
        {
          message: "Quote is already converted to an order",
          orderId: quote.convertedOrder.id,
          orderNumber: quote.convertedOrder.orderNumber,
        },
        { status: 200 }
      );
    }

    // Generate branch-sequenced Order Number via SequenceTracker
    let targetSpokeId = quote.spokeId;
    if (!targetSpokeId) {
      const firstSpoke = await prisma.spoke.findFirst();
      targetSpokeId = firstSpoke?.id || null;
    }

    const orderNumber = targetSpokeId
      ? await generateNextNumber(targetSpokeId, "ORDER")
      : `ORD-${new Date().getFullYear().toString().slice(-2)}-001`;

    // Transaction to create order and update quote status to WON
    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          orderNumber,
          quoteId: quote.id,
          clientId: quote.clientId || null,
          clientName: quote.clientName,
          address: quote.address,
          city: quote.city,
          state: quote.state,
          zip: quote.zip,
          latitude: quote.latitude || null,
          longitude: quote.longitude || null,
          marketerId: quote.marketerId || null,
          spokeId: quote.spokeId || null,
          surveyTypeId: quote.surveyTypeId,
          status: "FIELD_PENDING",
        },
      }),
      prisma.quote.update({
        where: { id: quote.id },
        data: { status: "WON" },
      }),
    ]);

    // If there were any documents attached to quote, we can link them to order as well
    await prisma.document.updateMany({
      where: { quoteId: quote.id },
      data: { orderId: order.id },
    });

    // Audit log order creation from quote
    const actingUserId = session?.user?.id || quote.assignedCsrId || "";
    await logAction(
      "ORDER",
      order.id,
      "QUOTE_CONVERTED",
      `Work order converted and initialized from Quote #${quote.quoteNumber}`,
      actingUserId
    );

    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to convert quote to order:", error);
    return NextResponse.json(
      { error: "Failed to convert quote to order" },
      { status: 500 }
    );
  }
}
