import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasAdminAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const body = await req.json();
    const { name, defaultPrice, basePrice, includedFeatures, excludedFeatures } = body;

    const dataToUpdate: any = {};

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return NextResponse.json(
          { error: "Survey type name cannot be empty" },
          { status: 400 }
        );
      }
      dataToUpdate.name = trimmedName;
    }

    const priceVal = defaultPrice ?? basePrice;
    if (priceVal !== undefined) {
      dataToUpdate.defaultPrice = parseFloat(priceVal) || 0.0;
    }

    if (includedFeatures !== undefined) {
      dataToUpdate.includedFeatures = Array.isArray(includedFeatures)
        ? includedFeatures
        : typeof includedFeatures === "string" && includedFeatures.trim()
        ? includedFeatures.split("\n").map((s) => s.trim()).filter(Boolean)
        : [];
    }

    if (excludedFeatures !== undefined) {
      dataToUpdate.excludedFeatures = Array.isArray(excludedFeatures)
        ? excludedFeatures
        : typeof excludedFeatures === "string" && excludedFeatures.trim()
        ? excludedFeatures.split("\n").map((s) => s.trim()).filter(Boolean)
        : [];
    }

    const updatedSurveyType = await prisma.surveyType.update({
      where: { id: params.id },
      data: dataToUpdate,
      include: {
        _count: {
          select: {
            quotes: true,
            orders: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSurveyType);
  } catch (error: any) {
    console.error("Failed to update survey type:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update survey type" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasAdminAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    // Check if there are associated quotes or orders
    const count = await prisma.surveyType.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { quotes: true, orders: true },
        },
      },
    });

    if (count && (count._count.quotes > 0 || count._count.orders > 0)) {
      return NextResponse.json(
        { error: "Cannot delete survey type that is currently used in existing quotes or orders." },
        { status: 400 }
      );
    }

    await prisma.surveyType.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete survey type:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete survey type" },
      { status: 500 }
    );
  }
}
