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
          payments: true,
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

    const recipientEmail = order.clientEmail || order.client?.email;
    if (!recipientEmail) {
      return NextResponse.json({ error: "No email address found on file for this order." }, { status: 400 });
    }

    const totalPaid = order.payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
    const balanceDue = ((Number(order.surveyPrice) || 0) + (Number(order.miscAmt) || 0)) - totalPaid;

    let finalSubject = settings?.orderConfirmEmailSubject || `Order Confirmation: ${order.orderNumber}`;
    let finalBody =
      settings?.orderConfirmEmailTemplate ||
      `Dear {{clientName}},\n\nYour work order #{{orderNumber}} for {{address}} has been confirmed and placed into our active project schedule.\n\nThank you for your business!`;

    const replacements: Record<string, string> = {
      "{{clientName}}": order.client?.name || order.clientName || "Client",
      "{{orderNumber}}": order.orderNumber,
      "{{address}}": order.address || "",
      "{{priceDue}}": `$${balanceDue.toFixed(2)}`,
      "{{estimatedCompletion}}": order.estimatedDelivery || "TBD",
      "{{clientFileNumber}}": order.clientFileNumber || "N/A",
      "{{companyName}}": settings?.companyName || "Survey CRM",
    };

    for (const [key, value] of Object.entries(replacements)) {
      finalSubject = finalSubject.replace(new RegExp(key, "g"), value);
      finalBody = finalBody.replace(new RegExp(key, "g"), value);
    }

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
      to: recipientEmail,
      subject: finalSubject,
      text: finalBody,
    });

    // Record email communication history in EmailLog
    await prisma.emailLog.create({
      data: {
        subject: finalSubject,
        body: finalBody,
        sentTo: recipientEmail,
        orderId: order.id,
      },
    });

    // Log the audit event
    await logAction(
      "ORDER",
      order.id,
      "EMAIL_SENT",
      `Sent Order Confirmation email to ${recipientEmail} (Order #${order.orderNumber})`,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: `Order confirmation successfully sent to ${recipientEmail}`,
      subject: finalSubject,
      body: finalBody,
      sentTo: recipientEmail,
    });
  } catch (error: any) {
    console.error("Failed to send order confirmation email:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send order confirmation email via SMTP" },
      { status: 500 }
    );
  }
}
