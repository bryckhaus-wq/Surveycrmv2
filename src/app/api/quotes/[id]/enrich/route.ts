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
    const quote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const address = body.address || quote.address;
    const statePrefix = body.state || quote.state;

    const updatedRecord = await enrichPropertyData(
      quote.id,
      "quote",
      address,
      statePrefix
    );

    await logAction(
      "QUOTE",
      quote.id,
      "PROPERTY_ENRICHED",
      `GIS and aerial satellite data enriched for quote ${quote.quoteNumber}`,
      session.user?.id || "SYSTEM"
    );

    return NextResponse.json({
      success: true,
      quote: updatedRecord,
      data: updatedRecord,
    });
  } catch (error: any) {
    console.error("Failed to enrich quote:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to enrich property data" },
      { status: 500 }
    );
  }
}
