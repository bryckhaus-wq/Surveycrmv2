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
    const { maxAcres, price } = body;

    const updated = await prisma.pricingBand.update({
      where: { id: params.id },
      data: {
        ...(maxAcres !== undefined && { maxAcres: parseFloat(maxAcres) }),
        ...(price !== undefined && { price: parseFloat(price) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to update pricing band:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update pricing band" },
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

    await prisma.pricingBand.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Band deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete pricing band:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete pricing band" },
      { status: 500 }
    );
  }
}
