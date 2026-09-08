import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FIELD_WORKER, hasFinancialAccess } from "@/lib/rbac";
import { logAction } from "@/lib/audit";
import { triggerN8nWebhook } from "@/lib/webhook";

export const dynamic = "force-dynamic";

function sanitizeOrder(order: any, role?: string | null) {
  if (!order) return order;
  const isFieldWorker = role === FIELD_WORKER;
  if (!hasFinancialAccess(role) || isFieldWorker) {
    const sanitized = { ...order };
    if (sanitized.quote) {
      const sanitizedQuote = { ...sanitized.quote };
      delete sanitizedQuote.price;
      sanitized.quote = sanitizedQuote;
    }
    if (sanitized.client) {
      const sanitizedClient = { ...sanitized.client };
      delete sanitizedClient.defaultInvoiceRules;
      sanitized.client = sanitizedClient;
    }
    return sanitized;
  }
  return order;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        surveyType: true,
        assignedUser: true,
        marketer: true,
        client: true,
        spoke: true,
        researcher: true,
        fieldCrew: true,
        drafter: true,
        checker: true,
        signingSurveyor: true,
        emailLogs: {
          orderBy: { sentAt: "desc" },
        },
        quote: {
          include: {
            csr: true,
            marketer: true,
            client: true,
          },
        },
        payments: {
          orderBy: { date: "desc" },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(sanitizeOrder(order, session.user.role));
  } catch (error) {
    console.error("Failed to fetch order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const {
      status,
      fieldNotes,
      assignedUserId,
      marketerId,
      spokeId,
      clientName,
      clientEmail,
      clientPhone,
      orderByName,
      address,
      city,
      state,
      zip,
      clientId,
      orderedBy,
      fieldDueDate,
      clientDueDate,
      internalDueDate,
      closingDate,
      scheduledDate,
      completionDate,
      county,
      taxParcelId,
      lot,
      block,
      subdivision,
      acres,
      primaryOwner,
      propertyClass,
      satelliteImagePath,
      latitude,
      longitude,
      surveyType,
      surveyTypeId,
      surveyTypeCustom,
      specialInstructions,
      internalDraftingNotes,
      isFhaVaLoan,
      crewComments,
      pointsOfInterest,
      surveyPrice,
      miscAmt,
      miscAmtDescription,
      discountAmt,
      depositPaid,
      finalPaymentReceived,
      taxRate,
      researcherId,
      fieldCrewId,
      drafterId,
      checkerId,
      signingSurveyorId,
    } = body;

    // Fetch existing order prior to update for audit trail comparison
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        assignedUser: true,
        marketer: true,
        researcher: true,
        fieldCrew: true,
        drafter: true,
        checker: true,
        signingSurveyor: true,
      },
    });

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(fieldNotes !== undefined && { fieldNotes }),
        ...(assignedUserId !== undefined && {
          assignedUserId: assignedUserId || null,
        }),
        ...(marketerId !== undefined && {
          marketerId: marketerId || null,
        }),
        ...(spokeId !== undefined && {
          spokeId: spokeId || null,
        }),
        ...(clientName !== undefined && { clientName: clientName ? clientName.trim() : null }),
        ...(clientEmail !== undefined && { clientEmail: clientEmail ? clientEmail.trim() : null }),
        ...(clientPhone !== undefined && { clientPhone: clientPhone ? clientPhone.trim() : null }),
        ...(orderByName !== undefined && { orderByName: orderByName ? orderByName.trim() : null }),
        ...(orderedBy !== undefined && {
          orderedBy: orderedBy ? orderedBy.trim() : null,
          orderByName: orderByName !== undefined ? (orderByName ? orderByName.trim() : null) : (orderedBy ? orderedBy.trim() : null),
        }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zip !== undefined && { zip }),
        ...(clientId !== undefined && { clientId: clientId || null }),
        ...(fieldDueDate !== undefined && {
          fieldDueDate: fieldDueDate ? new Date(fieldDueDate) : null,
        }),
        ...(clientDueDate !== undefined && {
          clientDueDate: clientDueDate ? new Date(clientDueDate) : null,
        }),
        ...(internalDueDate !== undefined && {
          internalDueDate: internalDueDate ? new Date(internalDueDate) : null,
        }),
        ...(closingDate !== undefined && {
          closingDate: closingDate ? new Date(closingDate) : null,
        }),
        ...(scheduledDate !== undefined && {
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        }),
        ...(completionDate !== undefined && {
          completionDate: completionDate ? new Date(completionDate) : null,
        }),
        ...(county !== undefined && { county: county ? county.trim() : null }),
        ...(taxParcelId !== undefined && { taxParcelId: taxParcelId ? taxParcelId.trim() : null }),
        ...(lot !== undefined && { lot: lot ? lot.trim() : null }),
        ...(block !== undefined && { block: block ? block.trim() : null }),
        ...(subdivision !== undefined && { subdivision: subdivision ? subdivision.trim() : null }),
        ...(acres !== undefined && { acres: acres !== null ? parseFloat(acres) : null }),
        ...(primaryOwner !== undefined && { primaryOwner: primaryOwner ? primaryOwner.trim() : null }),
        ...(propertyClass !== undefined && { propertyClass: propertyClass ? propertyClass.trim() : null }),
        ...(satelliteImagePath !== undefined && { satelliteImagePath: satelliteImagePath || null }),
        ...(latitude !== undefined && { latitude: latitude !== null ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude !== null ? parseFloat(longitude) : null }),
        ...(surveyTypeId !== undefined && { surveyTypeId }),
        ...(surveyType !== undefined && { surveyTypeCustom: surveyType ? surveyType.trim() : null }),
        ...(surveyTypeCustom !== undefined && { surveyTypeCustom: surveyTypeCustom ? surveyTypeCustom.trim() : null }),
        ...(specialInstructions !== undefined && { specialInstructions: specialInstructions ? specialInstructions.trim() : null }),
        ...(internalDraftingNotes !== undefined && { internalDraftingNotes: internalDraftingNotes ? internalDraftingNotes.trim() : null }),
        ...(isFhaVaLoan !== undefined && { isFhaVaLoan: Boolean(isFhaVaLoan) }),
        ...(crewComments !== undefined && { crewComments: crewComments ? crewComments.trim() : null }),
        ...(pointsOfInterest !== undefined && { pointsOfInterest: pointsOfInterest ? pointsOfInterest.trim() : null }),
        ...(surveyPrice !== undefined && { surveyPrice: parseFloat(String(surveyPrice)) || 0 }),
        ...(miscAmt !== undefined && { miscAmt: parseFloat(String(miscAmt)) || 0 }),
        ...(miscAmtDescription !== undefined && { miscAmtDescription: miscAmtDescription ? miscAmtDescription.trim() : null }),
        ...(discountAmt !== undefined && { discountAmt: parseFloat(String(discountAmt)) || 0 }),
        ...(depositPaid !== undefined && { depositPaid: parseFloat(String(depositPaid)) || 0 }),
        ...(finalPaymentReceived !== undefined && { finalPaymentReceived: parseFloat(String(finalPaymentReceived)) || 0 }),
        ...(taxRate !== undefined && { taxRate: parseFloat(String(taxRate)) || 0 }),
        ...(researcherId !== undefined && { researcherId: researcherId || null }),
        ...(fieldCrewId !== undefined && { fieldCrewId: fieldCrewId || null }),
        ...(drafterId !== undefined && { drafterId: drafterId || null }),
        ...(checkerId !== undefined && { checkerId: checkerId || null }),
        ...(signingSurveyorId !== undefined && { signingSurveyorId: signingSurveyorId || null }),
      },
      include: {
        surveyType: true,
        assignedUser: true,
        marketer: true,
        client: true,
        spoke: true,
        researcher: true,
        fieldCrew: true,
        drafter: true,
        checker: true,
        signingSurveyor: true,
        quote: true,
        documents: true,
      },
    });

    // Record audit events if monitored fields changed
    if (session?.user?.id && existingOrder) {
      if (status !== undefined && status !== existingOrder.status) {
        await logAction(
          "ORDER",
          params.id,
          "STATUS_CHANGE",
          `Status changed from ${existingOrder.status.replace("_", " ")} to ${status.replace("_", " ")}`,
          session.user.id
        );
      }

      if (
        assignedUserId !== undefined &&
        assignedUserId !== existingOrder.assignedUserId
      ) {
        const oldStaff = existingOrder.assignedUser;
        const newStaff = updatedOrder.assignedUser;
        await logAction(
          "ORDER",
          params.id,
          "REASSIGNED",
          `Assigned specialist changed from ${oldStaff?.name || "Unassigned"} to ${newStaff?.name || "Unassigned"}`,
          session.user.id
        );
      }

      if (marketerId !== undefined && marketerId !== existingOrder.marketerId) {
        const oldStaff = existingOrder.marketer || (existingOrder.marketerId ? await prisma.user.findUnique({ where: { id: existingOrder.marketerId } }) : null);
        const newStaff = marketerId ? await prisma.user.findUnique({ where: { id: marketerId } }) : null;
        await logAction(
          "ORDER",
          params.id,
          "UPDATE",
          `Marketer changed from ${oldStaff?.name || "Unassigned"} to ${newStaff?.name || "Unassigned"}`,
          session.user.id
        );
      }

      if (signingSurveyorId !== undefined && signingSurveyorId !== existingOrder.signingSurveyorId) {
        const oldStaff = existingOrder.signingSurveyor || (existingOrder.signingSurveyorId ? await prisma.user.findUnique({ where: { id: existingOrder.signingSurveyorId } }) : null);
        const newStaff = signingSurveyorId ? await prisma.user.findUnique({ where: { id: signingSurveyorId } }) : null;
        await logAction(
          "ORDER",
          params.id,
          "UPDATE",
          `Signing Surveyor changed from ${oldStaff?.name || "Unassigned"} to ${newStaff?.name || "Unassigned"}`,
          session.user.id
        );
      }

      if (researcherId !== undefined && researcherId !== existingOrder.researcherId) {
        const oldStaff = existingOrder.researcher || (existingOrder.researcherId ? await prisma.user.findUnique({ where: { id: existingOrder.researcherId } }) : null);
        const newStaff = researcherId ? await prisma.user.findUnique({ where: { id: researcherId } }) : null;
        await logAction(
          "ORDER",
          params.id,
          "UPDATE",
          `Researcher changed from ${oldStaff?.name || "Unassigned"} to ${newStaff?.name || "Unassigned"}`,
          session.user.id
        );
      }

      if (checkerId !== undefined && checkerId !== existingOrder.checkerId) {
        const oldStaff = existingOrder.checker || (existingOrder.checkerId ? await prisma.user.findUnique({ where: { id: existingOrder.checkerId } }) : null);
        const newStaff = checkerId ? await prisma.user.findUnique({ where: { id: checkerId } }) : null;
        await logAction(
          "ORDER",
          params.id,
          "UPDATE",
          `Checker changed from ${oldStaff?.name || "Unassigned"} to ${newStaff?.name || "Unassigned"}`,
          session.user.id
        );
      }

      if (drafterId !== undefined && drafterId !== existingOrder.drafterId) {
        const oldStaff = existingOrder.drafter || (existingOrder.drafterId ? await prisma.user.findUnique({ where: { id: existingOrder.drafterId } }) : null);
        const newStaff = drafterId ? await prisma.user.findUnique({ where: { id: drafterId } }) : null;
        await logAction(
          "ORDER",
          params.id,
          "UPDATE",
          `CAD Drafter changed from ${oldStaff?.name || "Unassigned"} to ${newStaff?.name || "Unassigned"}`,
          session.user.id
        );
      }

      if (fieldCrewId !== undefined && fieldCrewId !== existingOrder.fieldCrewId) {
        const oldStaff = existingOrder.fieldCrew || (existingOrder.fieldCrewId ? await prisma.user.findUnique({ where: { id: existingOrder.fieldCrewId } }) : null);
        const newStaff = fieldCrewId ? await prisma.user.findUnique({ where: { id: fieldCrewId } }) : null;
        await logAction(
          "ORDER",
          params.id,
          "UPDATE",
          `Field Crew changed from ${oldStaff?.name || "Unassigned"} to ${newStaff?.name || "Unassigned"}`,
          session.user.id
        );
      }

      if (
        crewComments !== undefined &&
        (crewComments ? crewComments.trim() : null) !== existingOrder.crewComments
      ) {
        await logAction(
          "ORDER",
          params.id,
          "UPDATE",
          `Field Notes changed.\nOld: ${existingOrder.crewComments || "None"}\nNew: ${crewComments ? crewComments.trim() : "None"}`,
          session.user.id
        );
      }

      if (
        specialInstructions !== undefined &&
        (specialInstructions ? specialInstructions.trim() : null) !== existingOrder.specialInstructions
      ) {
        await logAction(
          "ORDER",
          params.id,
          "UPDATE",
          `Special Instructions changed.\nOld: ${existingOrder.specialInstructions || "None"}\nNew: ${specialInstructions ? specialInstructions.trim() : "None"}`,
          session.user.id
        );
      }

      if (
        internalDraftingNotes !== undefined &&
        (internalDraftingNotes ? internalDraftingNotes.trim() : null) !== existingOrder.internalDraftingNotes
      ) {
        await logAction(
          "ORDER",
          params.id,
          "UPDATE",
          `Internal Drafting Notes changed.\nOld: ${existingOrder.internalDraftingNotes || "None"}\nNew: ${internalDraftingNotes ? internalDraftingNotes.trim() : "None"}`,
          session.user.id
        );
      }

      if (
        pointsOfInterest !== undefined &&
        (pointsOfInterest ? pointsOfInterest.trim() : null) !== existingOrder.pointsOfInterest
      ) {
        await logAction(
          "ORDER",
          params.id,
          "UPDATE",
          `Points of Interest changed.\nOld: ${existingOrder.pointsOfInterest || "None"}\nNew: ${pointsOfInterest ? pointsOfInterest.trim() : "None"}`,
          session.user.id
        );
      }

      if (fieldDueDate !== undefined) {
        const oldDate = existingOrder.fieldDueDate
          ? new Date(existingOrder.fieldDueDate).toISOString().split("T")[0]
          : "None";
        const newDate = fieldDueDate
          ? new Date(fieldDueDate).toISOString().split("T")[0]
          : "None";
        if (oldDate !== newDate) {
          await logAction(
            "ORDER",
            params.id,
            "DATE_CHANGED",
            `Field due date changed from ${oldDate} to ${newDate}`,
            session.user.id
          );
        }
      }

      if (
        fieldNotes !== undefined &&
        fieldNotes !== existingOrder.fieldNotes &&
        crewComments === undefined
      ) {
        await logAction(
          "ORDER",
          params.id,
          "NOTES_UPDATED",
          `Field notes changed.\nOld: ${existingOrder.fieldNotes || "None"}\nNew: ${fieldNotes ? fieldNotes.trim() : "None"}`,
          session.user.id
        );
      }
    }

    if (status === "COMPLETED" && status !== "CANCELLED") {
      await triggerN8nWebhook("ORDER_COMPLETED", {
        orderId: params.id,
        clientName: updatedOrder.client ? updatedOrder.client.name : updatedOrder.clientName,
        spokeId: updatedOrder.spokeId,
      });
    }

    return NextResponse.json(sanitizeOrder(updatedOrder, session.user.role));
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
