import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    const { state, key, label, price, isPerUnit } = body;

    const updated = await prisma.pricingAddon.update({
      where: { id: params.id },
      data: {
        ...(state !== undefined && { state: state.trim().toUpperCase() }),
        ...(key !== undefined && { key: key.trim().toLowerCase() }),
        ...(label !== undefined && { label: label.trim() }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(isPerUnit !== undefined && { isPerUnit: Boolean(isPerUnit) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to update pricing addon:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update pricing addon" },
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

    await prisma.pricingAddon.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Addon deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete pricing addon:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete pricing addon" },
      { status: 500 }
    );
  }
}
