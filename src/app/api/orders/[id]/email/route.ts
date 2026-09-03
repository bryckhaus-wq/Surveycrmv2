import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { subject, body } = await req.json();

    if (!subject || !body) {
      return NextResponse.json(
        { error: "Subject and email body are required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        quote: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const recipientEmail =
      (order as any).client?.email ||
      (order as any).quote?.client?.email ||
      (order as any).quote?.clientEmail;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: `Client "${order.clientName}" does not have an email address on file.` },
        { status: 400 }
      );
    }

    // SMTP Transporter configuration
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

    await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject: subject.trim(),
      text: body.trim(),
    });

    // Log the audit event
    await logAction(
      "ORDER",
      params.id,
      "EMAIL_SENT",
      `Emailed Client: "${subject.trim()}"`,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: `Email successfully sent to ${recipientEmail}`,
    });
  } catch (error: any) {
    console.error("Failed to send order email to client:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send email via SMTP" },
      { status: 500 }
    );
  }
}
