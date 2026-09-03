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
    const [order, settings] = await Promise.all([
      prisma.order.findUnique({
        where: { id: params.id },
        include: {
          client: true,
          quote: {
            include: {
              client: true,
            },
          },
        },
      }),
      prisma.systemSettings.findUnique({
        where: { id: "default" },
      }),
    ]);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const rawRecipientEmail =
      order.client?.email ||
      order.quote?.client?.email ||
      order.quote?.clientEmail;

    if (!rawRecipientEmail) {
      return NextResponse.json(
        {
          error: `Client "${order.clientName}" does not have an email address on file.`,
        },
        { status: 400 }
      );
    }

    const sanitizedEmails = rawRecipientEmail
      .split(",")
      .map((e: string) => e.trim())
      .filter(Boolean)
      .join(", ");

    if (!sanitizedEmails) {
      return NextResponse.json(
        {
          error: `Client "${order.clientName}" does not have a valid email address.`,
        },
        { status: 400 }
      );
    }

    let emailBody =
      settings?.orderConfirmEmailTemplate ||
      `Dear {{clientName}},\n\nYour work order #{{orderNumber}} for {{address}} has been confirmed and placed into our active project schedule.\n\nThank you for your business!`;

    emailBody = emailBody
      .replace(/{{clientName}}/g, order.client?.name || order.clientName || "Client")
      .replace(/{{orderNumber}}/g, order.orderNumber)
      .replace(/{{address}}/g, order.address || "");

    const emailSubject = `Order Confirmation: ${order.orderNumber}`;

    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const host = process.env.SMTP_HOST || "smtp.example.com";
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";
    const fromAddress =
      process.env.SMTP_FROM || settings?.email || "orders@mjslandsurvey.com";

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from: fromAddress,
      to: sanitizedEmails,
      subject: emailSubject,
      text: emailBody,
    });

    // Record email communication history in EmailLog
    await prisma.emailLog.create({
      data: {
        subject: emailSubject,
        body: emailBody,
        sentTo: sanitizedEmails,
        orderId: order.id,
      },
    });

    // Log the audit event
    await logAction(
      "ORDER",
      order.id,
      "EMAIL_SENT",
      `Sent Order Confirmation email to ${sanitizedEmails} (Order #${order.orderNumber})`,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: `Order confirmation successfully sent to ${sanitizedEmails}`,
      subject: emailSubject,
      body: emailBody,
      sentTo: sanitizedEmails,
    });
  } catch (error: any) {
    console.error("Failed to send order confirmation email:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send order confirmation email via SMTP" },
      { status: 500 }
    );
  }
}
