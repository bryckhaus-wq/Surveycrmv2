import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasClientAccess } from "@/lib/rbac";
import { generateNextNumber } from "@/lib/sequence";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasClientAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const spokeId = searchParams.get("spokeId");

    const quotes = await prisma.quote.findMany({
      where: {
        ...(spokeId && spokeId !== "ALL" ? { spokeId } : {}),
      },
      include: {
        surveyType: true,
        csr: true,
        marketer: true,
        client: true,
        spoke: true,
        convertedOrder: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Failed to fetch quotes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasClientAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const body = await req.json();
    const {
      clientId,
      clientName,
      clientEmail,
      clientPhone,
      address,
      city,
      state,
      zip,
      latitude,
      longitude,
      surveyTypeId,
      assignedCsrId,
      marketerId,
      spokeId,
      price,
      status,
      includedFeatures,
      excludedFeatures,
      customScope,
    } = body;

    if (!clientName || !address || !city || !state || !zip || !surveyTypeId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (spokeId) {
      await generateNextNumber(spokeId, "QUOTE");
    }

    const quote = await prisma.quote.create({
      data: {
        clientId: clientId || null,
        clientName,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        address,
        city,
        state,
        zip,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        surveyTypeId,
        assignedCsrId: assignedCsrId || null,
        marketerId: marketerId || null,
        spokeId: spokeId || null,
        price: price ? parseFloat(price) : 0.0,
        status: status || "NEW",
        includedFeatures: includedFeatures || null,
        excludedFeatures: excludedFeatures || null,
        customScope: customScope || null,
      },
      include: {
        surveyType: true,
        csr: true,
        marketer: true,
        client: true,
        spoke: true,
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("Failed to create quote:", error);
    return NextResponse.json(
      { error: "Failed to create quote" },
      { status: 500 }
    );
  }
}
