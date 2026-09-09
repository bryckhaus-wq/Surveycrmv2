import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enrichPropertyData } from "@/services/gisEnrichmentService";
import { prisma } from "@/lib/prisma";
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
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const address = body.address || order.address;
    const statePrefix = body.state || order.state;

    const updatedRecord = await enrichPropertyData(
      order.id,
      "order",
      address,
      statePrefix
    );

    await logAction(
      "ORDER",
      order.id,
      "PROPERTY_ENRICHED",
      `GIS and aerial satellite data enriched for order ${order.orderNumber}`,
      session.user?.id || "SYSTEM"
    );

    return NextResponse.json({
      success: true,
      order: updatedRecord,
      data: updatedRecord,
    });
  } catch (error: any) {
    console.error("Failed to enrich order:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to enrich property data" },
      { status: 500 }
    );
  }
}
