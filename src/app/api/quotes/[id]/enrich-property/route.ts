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

    const quote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const enriched = await enrichPropertyData({
      id: quote.id,
      entityType: "QUOTE",
      address: address || quote.address,
      city: city || quote.city,
      state: state || quote.state,
      zip: zip || quote.zip,
      county: county || quote.county || undefined,
    });

    await logAction(
      "QUOTE",
      quote.id,
      "PROPERTY_ENRICHED",
      `GIS and aerial satellite data captured (Parcel: ${enriched.taxParcelId || "N/A"}, Acres: ${enriched.acres || "N/A"})`,
      session.user?.id || "SYSTEM"
    );

    const updatedQuote = await prisma.quote.findUnique({
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
      quote: updatedQuote,
    });
  } catch (error: any) {
    console.error("Failed to enrich property data for quote:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to enrich property data" },
      { status: 500 }
    );
  }
}
