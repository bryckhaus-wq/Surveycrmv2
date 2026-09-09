import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const zone = await prisma.pricingZone.findUnique({
      where: { id: params.id },
      include: {
        bands: {
          orderBy: { maxAcres: "asc" },
        },
      },
    });

    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json(zone);
  } catch (error: any) {
    console.error("Failed to fetch pricing zone:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch pricing zone" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, state, description, color, priority, quoteOnly, outOfArea, basePrice, geometry, bands } = body;

    const updated = await prisma.pricingZone.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(state !== undefined && { state: state.trim().toUpperCase() }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color: color || "#3b82f6" }),
        ...(priority !== undefined && { priority: parseInt(String(priority), 10) }),
        ...(quoteOnly !== undefined && { quoteOnly: Boolean(quoteOnly) }),
        ...(outOfArea !== undefined && { outOfArea: Boolean(outOfArea) }),
        ...(basePrice !== undefined && {
          basePrice: basePrice !== null && basePrice !== "" ? parseFloat(basePrice) : null,
        }),
        ...(geometry !== undefined && { geometry: geometry || null }),
      },
      include: {
        bands: {
          orderBy: { maxAcres: "asc" },
        },
      },
    });

    // If bands array is explicitly provided, synchronize bands
    if (Array.isArray(bands)) {
      await prisma.pricingBand.deleteMany({ where: { zoneId: params.id } });
      for (const b of bands) {
        await prisma.pricingBand.create({
          data: {
            zoneId: params.id,
            maxAcres: parseFloat(b.maxAcres),
            price: parseFloat(b.price),
          },
        });
      }
    }

    const finalZone = await prisma.pricingZone.findUnique({
      where: { id: params.id },
      include: {
        bands: {
          orderBy: { maxAcres: "asc" },
        },
      },
    });

    return NextResponse.json(finalZone);
  } catch (error: any) {
    console.error("Failed to update pricing zone:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update pricing zone" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await prisma.pricingZone.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Zone deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete pricing zone:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete pricing zone" },
      { status: 500 }
    );
  }
}
