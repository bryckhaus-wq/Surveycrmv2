import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildOrderInvoicePDFDoc } from "@/lib/pdfGenerator";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const [order, settings] = await Promise.all([
      prisma.order.findUnique({
        where: { id: params.id },
        include: {
          surveyType: true,
          client: true,
          spoke: true,
          payments: {
            orderBy: { date: "desc" },
          },
        },
      }),
      prisma.systemSettings.findUnique({
        where: { id: "default" },
      }),
    ]);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const doc = buildOrderInvoicePDFDoc(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        orderedBy: order.orderedBy,
        address: order.address,
        city: order.city,
        state: order.state,
        zip: order.zip,
        county: order.county,
        taxParcelId: order.taxParcelId,
        lot: order.lot,
        block: order.block,
        subdivision: order.subdivision,
        surveyType: order.surveyType,
        surveyTypeCustom: order.surveyTypeCustom,
        surveyPrice: order.surveyPrice,
        miscAmt: order.miscAmt,
        miscAmtDescription: order.miscAmtDescription,
        discountAmt: order.discountAmt,
        depositPaid: order.depositPaid,
        finalPaymentReceived: order.finalPaymentReceived,
        taxRate: order.taxRate,
        payments: order.payments,
        clientDueDate: order.clientDueDate ? order.clientDueDate.toISOString() : null,
        completionDate: order.completionDate ? order.completionDate.toISOString() : null,
        createdAt: order.createdAt.toISOString(),
        client: order.client,
        spoke: order.spoke,
      },
      settings
    );

    const pdfArrayBuffer = doc.output("arraybuffer");
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    const cleanClientName = (order.clientName || "Client").replace(/[^a-zA-Z0-9]/g, "_");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Invoice-${order.orderNumber}-${cleanClientName}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Failed to generate order invoice PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate order invoice PDF" },
      { status: 500 }
    );
  }
}
