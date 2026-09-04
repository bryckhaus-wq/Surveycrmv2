import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
    });

    const body = await req.json();
    const { pdfBase64, toEmail, subject, message } = body;

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { client: true },
    });

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    const recipientEmail = toEmail || quote.clientEmail || quote.client?.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "No email address found on file for this quote." },
        { status: 400 }
      );
    }

    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const host = process.env.SMTP_HOST || "smtp.example.com";
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";
    const fromAddress =
      process.env.SMTP_FROM || settings?.email || "quotes@mjslandsurvey.com";

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });

    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    let finalSubject = subject || settings?.quoteEmailSubject || `Quote ${quote.quoteNumber}`;
    let finalBody = message || settings?.quoteEmailTemplate || "Please see the attached quote.";

    const priceNum = Number(quote.price) || 0;
    const replacements: Record<string, string> = {
      "{{clientName}}": quote.clientName || quote.client?.name || "Client",
      "{{quoteNumber}}": String(quote.quoteNumber),
      "{{address}}": quote.address || "",
      "{{priceDue}}": `$${priceNum.toFixed(2)}`,
      "{{estimatedCompletion}}": quote.estimatedDelivery || "TBD",
      "{{clientFileNumber}}": quote.clientFileNumber || "N/A",
      "{{companyName}}": settings?.companyName || "Survey CRM",
    };

    for (const [key, value] of Object.entries(replacements)) {
      finalSubject = finalSubject.replace(new RegExp(key, "g"), value);
      finalBody = finalBody.replace(new RegExp(key, "g"), value);
    }

    await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject: finalSubject,
      text: finalBody,
      attachments: [
        {
          filename: "Quote_Proposal.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    // Record email communication history in EmailLog
    await prisma.emailLog.create({
      data: {
        subject: finalSubject,
        body: finalBody,
        sentTo: recipientEmail,
        quoteId: params.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Proposal successfully sent to ${recipientEmail}`,
    });
  } catch (error: any) {
    console.error("Failed to send quote proposal email:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send proposal email via SMTP" },
      { status: 500 }
    );
  }
}
