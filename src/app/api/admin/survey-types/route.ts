import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasAdminAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const surveyTypes = await prisma.surveyType.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            quotes: true,
            orders: true,
          },
        },
      },
    });

    return NextResponse.json(surveyTypes);
  } catch (error) {
    console.error("Failed to fetch survey types:", error);
    return NextResponse.json(
      { error: "Failed to fetch survey types" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasAdminAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const body = await req.json();
    const { name, defaultPrice, includedFeatures, excludedFeatures } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Survey type name is required" },
        { status: 400 }
      );
    }

    const existingType = await prisma.surveyType.findUnique({
      where: { name },
    });

    if (existingType) {
      return NextResponse.json(
        { error: "Survey type with this name already exists" },
        { status: 409 }
      );
    }

    const surveyType = await prisma.surveyType.create({
      data: {
        name,
        defaultPrice: defaultPrice ? parseFloat(defaultPrice) : 0.0,
        includedFeatures: Array.isArray(includedFeatures)
          ? includedFeatures
          : includedFeatures
          ? [includedFeatures]
          : [],
        excludedFeatures: Array.isArray(excludedFeatures)
          ? excludedFeatures
          : excludedFeatures
          ? [excludedFeatures]
          : [],
      },
    });

    return NextResponse.json(surveyType, { status: 201 });
  } catch (error) {
    console.error("Failed to create survey type:", error);
    return NextResponse.json(
      { error: "Failed to create survey type" },
      { status: 500 }
    );
  }
}
