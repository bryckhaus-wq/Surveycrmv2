import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildQuotePDFDoc } from "@/lib/pdfGenerator";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const [quote, settings] = await Promise.all([
      prisma.quote.findUnique({
        where: { id: params.id },
        include: {
          surveyType: true,
          csr: true,
          marketer: true,
          client: true,
          spoke: true,
        },
      }),
      prisma.systemSettings.findUnique({
        where: { id: "default" },
      }),
    ]);

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const doc = buildQuotePDFDoc(
      {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        clientName: quote.clientName,
        clientEmail: quote.clientEmail,
        clientPhone: quote.clientPhone,
        address: quote.address,
        city: quote.city,
        state: quote.state,
        zip: quote.zip,
        latitude: quote.latitude,
        longitude: quote.longitude,
        price: Number(quote.price),
        status: quote.status,
        clientFileNumber: quote.clientFileNumber,
        estimatedDelivery: quote.estimatedDelivery,
        closingDate: quote.closingDate ? quote.closingDate.toISOString() : null,
        customScope: quote.customScope,
        includedFeatures: quote.includedFeatures,
        excludedFeatures: quote.excludedFeatures,
        createdAt: quote.createdAt.toISOString(),
        surveyType: quote.surveyType
          ? {
              name: quote.surveyType.name,
              defaultPrice: Number(quote.surveyType.defaultPrice),
            }
          : undefined,
        csr: quote.csr
          ? {
              name: quote.csr.name,
              email: quote.csr.email,
            }
          : null,
        spoke: quote.spoke,
      },
      settings
    );

    const pdfArrayBuffer = doc.output("arraybuffer");
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    const cleanClientName = (quote.clientName || "Client").replace(/[^a-zA-Z0-9]/g, "_");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Proposal-Quote-${quote.quoteNumber}-${cleanClientName}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Failed to generate quote PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate quote PDF" },
      { status: 500 }
    );
  }
}
