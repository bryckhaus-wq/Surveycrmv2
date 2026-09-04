import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateNextNumber } from "@/lib/sequence";
import { logAction } from "@/lib/audit";
import { triggerN8nWebhook } from "@/lib/webhook";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        client: true,
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

    // 1. Create the new Order with decoupled local snapshot data
    const order = await prisma.order.create({
      data: {
        orderNumber,
        quoteId: quote.id,
        clientId: quote.clientId || null,
        orderByName: quote.orderByName,
        orderedBy: quote.orderByName,
        clientName: quote.clientName,
        clientPhone: quote.clientPhone,
        clientEmail: quote.clientEmail,
        address: quote.address,
        city: quote.city,
        state: quote.state,
        zip: quote.zip,
        county: quote.county || null,
        latitude: quote.latitude || null,
        longitude: quote.longitude || null,
        marketerId: quote.marketerId || null,
        spokeId: targetSpokeId || quote.spokeId || null,
        surveyTypeId: quote.surveyTypeId,
        surveyPrice: Number(quote.price) || 0,
        closingDate: quote.closingDate || null,
        clientFileNumber: quote.clientFileNumber || null,
        estimatedDelivery: quote.estimatedDelivery || null,
        status: "FIELD_PENDING",
      },
      include: {
        client: true,
      },
    });

    // 2. Only after order is successfully created, update quote status to WON
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "WON" },
    });

    // 3. Transfer all documents associated with quote to also attach to new orderId and unlink from quote
    await prisma.document.updateMany({
      where: { quoteId: params.id },
      data: { orderId: order.id, quoteId: null },
    });

    const newOrder: any = {
      ...order,
      client: order.client || { name: order.clientName },
      price: quote.price,
    };

    // Trigger n8n webhook notification
    await triggerN8nWebhook("QUOTE_CONVERTED", {
      quoteId: params.id,
      orderId: newOrder.id,
      clientName: newOrder.client.name,
      price: newOrder.price,
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
  } catch (error: any) {
    console.error("Failed to convert quote to order:", error);
    return NextResponse.json(
      { error: error.message || "Failed to convert quote to order" },
      { status: 500 }
    );
  }
}
