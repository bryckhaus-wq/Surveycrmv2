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
    const body = await req.json().catch(() => ({}));
    const { address, county, state, city, zip } = body;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const enriched = await enrichPropertyData({
      id: order.id,
      entityType: "ORDER",
      address: address || order.address,
      city: city || order.city,
      state: state || order.state,
      zip: zip || order.zip,
      county: county || order.county || undefined,
    });

    await logAction(
      "ORDER",
      order.id,
      "PROPERTY_ENRICHED",
      `GIS and aerial satellite data captured (Parcel: ${enriched.taxParcelId || "N/A"}, Acres: ${enriched.acres || "N/A"})`,
      session.user?.id || "SYSTEM"
    );

    // Fetch refreshed order
    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("Failed to enrich property data for order:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to enrich property data" },
      { status: 500 }
    );
  }
}
