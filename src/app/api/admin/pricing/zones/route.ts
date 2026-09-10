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
    const state = searchParams.get("state");

    const zones = await prisma.pricingZone.findMany({
      where: state ? { state: state.toUpperCase() } : undefined,
      include: {
        bands: {
          orderBy: { maxAcres: "asc" },
        },
      },
      orderBy: [{ priority: "desc" }, { state: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(zones);
  } catch (error: any) {
    console.error("Failed to fetch pricing zones:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch pricing zones" },
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
    const {
      name,
      state,
      description,
      color,
      priority,
      quoteOnly,
      outOfArea,
      basePrice,
      geometry,
      escalationEmail,
      escalationName,
      bands,
    } = body;

    if (!name || !state) {
      return NextResponse.json(
        { error: "Zone name and state are required" },
        { status: 400 }
      );
    }

    const zone = await prisma.pricingZone.create({
      data: {
        name: name.trim(),
        state: state.trim().toUpperCase(),
        description: description || null,
        color: color || "#3b82f6",
        priority: priority !== undefined ? parseInt(String(priority), 10) : 0,
        quoteOnly: Boolean(quoteOnly),
        outOfArea: Boolean(outOfArea),
        basePrice: basePrice !== undefined && basePrice !== null && basePrice !== "" ? parseFloat(basePrice) : null,
        geometry: geometry || null,
        escalationEmail: escalationEmail ? escalationEmail.trim() : null,
        escalationName: escalationName ? escalationName.trim() : null,
        bands: {
          create: Array.isArray(bands)
            ? bands.map((b: any) => ({
                maxAcres: parseFloat(b.maxAcres),
                price: parseFloat(b.price),
              }))
            : [],
        },
      },
      include: {
        bands: {
          orderBy: { maxAcres: "asc" },
        },
      },
    });

    return NextResponse.json(zone);
  } catch (error: any) {
    console.error("Failed to create pricing zone:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create pricing zone" },
      { status: 500 }
    );
  }
}
