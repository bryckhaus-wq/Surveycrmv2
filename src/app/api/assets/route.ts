import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const spokeId = searchParams.get("spokeId");

    const assets = await prisma.asset.findMany({
      where: {
        ...(category && category !== "ALL" ? { category } : {}),
        ...(status && status !== "ALL" ? { status } : {}),
        ...(spokeId && spokeId !== "ALL" ? { spokeId } : {}),
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        spoke: true,
      },
      orderBy: {
        assetTag: "asc",
      },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error("Failed to fetch assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      assetTag,
      category,
      manufacturer,
      model,
      status,
      assignedUserId,
      spokeId,
      notes,
    } = body;

    if (!assetTag || !category || !manufacturer || !model) {
      return NextResponse.json(
        { error: "assetTag, category, manufacturer, and model are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.asset.findUnique({
      where: { assetTag },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Asset with tag ${assetTag} already exists` },
        { status: 409 }
      );
    }

    const asset = await prisma.asset.create({
      data: {
        assetTag: assetTag.trim(),
        category: category.trim(),
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        status: status || "DEPLOYABLE",
        assignedUserId: assignedUserId || null,
        spokeId: spokeId || null,
        notes: notes || null,
      },
      include: {
        assignedUser: true,
        spoke: true,
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("Failed to create asset:", error);
    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 }
    );
  }
}
