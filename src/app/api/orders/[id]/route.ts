import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FIELD_WORKER, hasFinancialAccess } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

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
        client: true,
        spoke: true,
        quote: {
          include: {
            csr: true,
            client: true,
          },
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
      clientName,
      address,
      city,
      state,
      zip,
      clientId,
      fieldDueDate,
    } = body;

    // Fetch existing order prior to update for audit trail comparison
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: { assignedUser: true },
    });

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(fieldNotes !== undefined && { fieldNotes }),
        ...(assignedUserId !== undefined && {
          assignedUserId: assignedUserId || null,
        }),
        ...(clientName !== undefined && { clientName }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zip !== undefined && { zip }),
        ...(clientId !== undefined && { clientId: clientId || null }),
        ...(fieldDueDate !== undefined && {
          fieldDueDate: fieldDueDate ? new Date(fieldDueDate) : null,
        }),
      },
      include: {
        surveyType: true,
        assignedUser: true,
        client: true,
        spoke: true,
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
        await logAction(
          "ORDER",
          params.id,
          "REASSIGNED",
          `Assigned specialist changed to ${updatedOrder.assignedUser?.name || "Unassigned"}`,
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
        fieldNotes !== existingOrder.fieldNotes
      ) {
        await logAction(
          "ORDER",
          params.id,
          "NOTES_UPDATED",
          "Field notes & observations updated",
          session.user.id
        );
      }
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
