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
    const body = await req.json();
    const { pdfBase64, toEmail, subject, message } = body;

    if (!toEmail || !pdfBase64) {
      return NextResponse.json(
        { error: "Recipient email and PDF data are required" },
        { status: 400 }
      );
    }

    const sanitizedEmails = String(toEmail)
      .split(",")
      .map((e: string) => e.trim())
      .filter(Boolean)
      .join(", ");

    if (!sanitizedEmails) {
      return NextResponse.json(
        { error: "A valid recipient email address is required" },
        { status: 400 }
      );
    }

    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const host = process.env.SMTP_HOST || "smtp.example.com";
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";
    const fromAddress = process.env.SMTP_FROM || "quotes@mjslandsurvey.com";

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const emailSubject = subject || "Survey Proposal from MJS Land Surveying";
    const emailBody = message || "Please find attached the official survey proposal for your review.";

    await transporter.sendMail({
      from: fromAddress,
      to: sanitizedEmails,
      subject: emailSubject,
      text: emailBody,
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
        subject: emailSubject,
        body: emailBody,
        sentTo: sanitizedEmails,
        quoteId: params.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Proposal successfully sent to ${sanitizedEmails}`,
    });
  } catch (error: any) {
    console.error("Failed to send quote proposal email:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send proposal email via SMTP" },
      { status: 500 }
    );
  }
}
