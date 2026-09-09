import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const zoneId = searchParams.get("zoneId");

    const bands = await prisma.pricingBand.findMany({
      where: zoneId ? { zoneId } : undefined,
      include: {
        zone: true,
      },
      orderBy: { maxAcres: "asc" },
    });

    return NextResponse.json(bands);
  } catch (error: any) {
    console.error("Failed to fetch pricing bands:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch pricing bands" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { zoneId, maxAcres, price } = body;

    if (!zoneId || maxAcres === undefined || price === undefined) {
      return NextResponse.json(
        { error: "zoneId, maxAcres, and price are required" },
        { status: 400 }
      );
    }

    const band = await prisma.pricingBand.create({
      data: {
        zoneId,
        maxAcres: parseFloat(maxAcres),
        price: parseFloat(price),
      },
    });

    return NextResponse.json(band);
  } catch (error: any) {
    console.error("Failed to create pricing band:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create pricing band" },
      { status: 500 }
    );
  }
}
