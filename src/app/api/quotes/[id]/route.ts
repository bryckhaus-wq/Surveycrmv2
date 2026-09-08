import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

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
        leadSource: true,
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
        emailLogs: {
          orderBy: { sentAt: "desc" },
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
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || "SYSTEM";

    const body = await req.json();
    const {
      clientId,
      clientName,
      clientEmail,
      clientPhone,
      orderByName,
      address,
      city,
      state,
      zip,
      county,
      taxParcelId,
      acres,
      primaryOwner,
      propertyClass,
      satelliteImagePath,
      latitude,
      longitude,
      surveyTypeId,
      assignedCsrId,
      marketerId,
      spokeId,
      price,
      status,
      clientFileNumber,
      estimatedDelivery,
      closingDate,
      leadSourceId,
      includedFeatures,
      excludedFeatures,
      customScope,
    } = body;

    const existingQuote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        csr: true,
        marketer: true,
        spoke: true,
      },
    });

    const updated = await prisma.quote.update({
      where: { id: params.id },
      data: {
        ...(clientId !== undefined && { clientId: clientId || null }),
        ...(clientName !== undefined && { clientName: clientName ? clientName.trim() : null }),
        ...(clientEmail !== undefined && { clientEmail: clientEmail ? clientEmail.trim() : null }),
        ...(clientPhone !== undefined && { clientPhone: clientPhone ? clientPhone.trim() : null }),
        ...(orderByName !== undefined && { orderByName: orderByName ? orderByName.trim() : null }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zip !== undefined && { zip }),
        ...(county !== undefined && { county: county ? county.trim() : null }),
        ...(taxParcelId !== undefined && { taxParcelId: taxParcelId ? taxParcelId.trim() : null }),
        ...(acres !== undefined && { acres: acres !== null ? parseFloat(acres) : null }),
        ...(primaryOwner !== undefined && { primaryOwner: primaryOwner ? primaryOwner.trim() : null }),
        ...(propertyClass !== undefined && { propertyClass: propertyClass ? propertyClass.trim() : null }),
        ...(satelliteImagePath !== undefined && { satelliteImagePath: satelliteImagePath || null }),
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
        ...(status !== undefined && { status: status as any }),
        ...(clientFileNumber !== undefined && {
          clientFileNumber: clientFileNumber ? clientFileNumber.trim() : null,
        }),
        ...(estimatedDelivery !== undefined && {
          estimatedDelivery: estimatedDelivery ? estimatedDelivery.trim() : null,
        }),
        ...(closingDate !== undefined && {
          closingDate: closingDate ? new Date(closingDate) : null,
        }),
        ...(leadSourceId !== undefined && {
          leadSourceId: leadSourceId || null,
        }),
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
        leadSource: true,
        emailLogs: {
          orderBy: { sentAt: "desc" },
        },
      },
    });

    // Record audit events if monitored fields changed
    if (existingQuote) {
      if (status !== undefined && status !== existingQuote.status) {
        await logAction(
          "QUOTE",
          params.id,
          "STATUS_CHANGE",
          `Status changed from ${existingQuote.status} to ${status}`,
          userId
        );
      }

      if (marketerId !== undefined && marketerId !== existingQuote.marketerId) {
        const oldStaff = existingQuote.marketer;
        const newStaff = marketerId ? await prisma.user.findUnique({ where: { id: marketerId } }) : null;
        await logAction(
          "QUOTE",
          params.id,
          "UPDATE",
          `Marketer changed from ${oldStaff?.name || "Unassigned"} to ${newStaff?.name || "Unassigned"}`,
          userId
        );
      }

      if (assignedCsrId !== undefined && assignedCsrId !== existingQuote.assignedCsrId) {
        const oldStaff = existingQuote.csr;
        const newStaff = assignedCsrId ? await prisma.user.findUnique({ where: { id: assignedCsrId } }) : null;
        await logAction(
          "QUOTE",
          params.id,
          "UPDATE",
          `Assigned CSR changed from ${oldStaff?.name || "Unassigned"} to ${newStaff?.name || "Unassigned"}`,
          userId
        );
      }

      if (
        customScope !== undefined &&
        (customScope ? customScope.trim() : null) !== existingQuote.customScope
      ) {
        await logAction(
          "QUOTE",
          params.id,
          "UPDATE",
          `Scope of Work changed.\nOld: ${existingQuote.customScope || "None"}\nNew: ${customScope ? customScope.trim() : "None"}`,
          userId
        );
      }

      if (
        clientEmail !== undefined &&
        (clientEmail ? clientEmail.trim() : null) !== existingQuote.clientEmail
      ) {
        await logAction(
          "QUOTE",
          params.id,
          "UPDATE",
          `Client Email changed from ${existingQuote.clientEmail || "None"} to ${clientEmail || "None"}`,
          userId
        );
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update quote:", error);
    return NextResponse.json(
      { error: "Failed to update quote" },
      { status: 500 }
    );
  }
}
