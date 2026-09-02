import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const spoke = await prisma.spoke.findUnique({
      where: { id: params.id },
      include: {
        users: true,
        quotes: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        assets: true,
        _count: {
          select: {
            users: true,
            quotes: true,
            orders: true,
            assets: true,
          },
        },
      },
    });

    if (!spoke) {
      return NextResponse.json({ error: "Spoke not found" }, { status: 404 });
    }

    return NextResponse.json(spoke);
  } catch (error) {
    console.error("Failed to fetch spoke:", error);
    return NextResponse.json(
      { error: "Failed to fetch spoke" },
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
      name,
      shortName,
      address,
      city,
      state,
      zip,
      lbNumber,
      dailyCapacity,
    } = body;

    const updated = await prisma.spoke.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(shortName !== undefined && {
          shortName: shortName.trim().toUpperCase(),
        }),
        ...(address !== undefined && { address: address ? address.trim() : null }),
        ...(city !== undefined && { city: city ? city.trim() : null }),
        ...(state !== undefined && {
          state: state ? state.trim().toUpperCase() : null,
        }),
        ...(zip !== undefined && { zip: zip ? zip.trim() : null }),
        ...(lbNumber !== undefined && {
          lbNumber: lbNumber ? lbNumber.trim() : null,
        }),
        ...(dailyCapacity !== undefined && {
          dailyCapacity: parseInt(dailyCapacity, 10),
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update spoke:", error);
    return NextResponse.json(
      { error: "Failed to update spoke" },
      { status: 500 }
    );
  }
}
