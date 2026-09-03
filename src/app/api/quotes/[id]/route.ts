import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        surveyType: true,
        csr: true,
        marketer: true,
        client: true,
        spoke: true,
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
        convertedOrder: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Failed to fetch quote:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote" },
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

    const updated = await prisma.quote.update({
      where: { id: params.id },
      data: {
        ...(clientId !== undefined && { clientId: clientId || null }),
        ...(clientName !== undefined && { clientName }),
        ...(clientEmail !== undefined && { clientEmail }),
        ...(clientPhone !== undefined && { clientPhone }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zip !== undefined && { zip }),
        ...(latitude !== undefined && {
          latitude: latitude !== null ? parseFloat(latitude) : null,
        }),
        ...(longitude !== undefined && {
          longitude: longitude !== null ? parseFloat(longitude) : null,
        }),
        ...(surveyTypeId !== undefined && { surveyTypeId }),
        ...(assignedCsrId !== undefined && { assignedCsrId: assignedCsrId || null }),
        ...(marketerId !== undefined && { marketerId: marketerId || null }),
        ...(spokeId !== undefined && { spokeId: spokeId || null }),
        ...(price !== undefined && {
          price: parseFloat(price),
        }),
        ...(status !== undefined && { status }),
        ...(includedFeatures !== undefined && { includedFeatures }),
        ...(excludedFeatures !== undefined && { excludedFeatures }),
        ...(customScope !== undefined && { customScope }),
      },
      include: {
        surveyType: true,
        csr: true,
        marketer: true,
        client: true,
        spoke: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update quote:", error);
    return NextResponse.json(
      { error: "Failed to update quote" },
      { status: 500 }
    );
  }
}
