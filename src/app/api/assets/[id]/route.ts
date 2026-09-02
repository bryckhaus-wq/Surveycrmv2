import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: params.id },
      include: {
        assignedUser: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Failed to fetch asset:", error);
    return NextResponse.json(
      { error: "Failed to fetch asset" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      assetTag,
      category,
      manufacturer,
      model,
      status,
      assignedUserId,
      notes,
    } = body;

    const updated = await prisma.asset.update({
      where: { id: params.id },
      data: {
        ...(assetTag !== undefined && { assetTag }),
        ...(category !== undefined && { category }),
        ...(manufacturer !== undefined && { manufacturer }),
        ...(model !== undefined && { model }),
        ...(status !== undefined && { status }),
        ...(assignedUserId !== undefined && {
          assignedUserId: assignedUserId || null,
        }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        assignedUser: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update asset:", error);
    return NextResponse.json(
      { error: "Failed to update asset" },
      { status: 500 }
    );
  }
}
