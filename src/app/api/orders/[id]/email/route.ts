import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { getPresignedDownloadUrl } from "@/lib/s3";
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
    const { subject, body, attachments = [] } = await req.json();

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

    // Resolve presigned URLs for MinIO / S3 attachments
    const mailAttachments = await Promise.all(
      (Array.isArray(attachments) ? attachments : []).map(async (doc: any) => {
        let downloadUrl = doc.url || doc.path;
        if (!downloadUrl && doc.s3Key) {
          downloadUrl = await getPresignedDownloadUrl(
            doc.s3Key,
            3600,
            doc.fileName
          );
        } else if (!downloadUrl && doc.id) {
          const dbDoc = await prisma.document.findUnique({
            where: { id: doc.id },
          });
          if (dbDoc) {
            downloadUrl = await getPresignedDownloadUrl(
              dbDoc.s3Key,
              3600,
              dbDoc.fileName
            );
          }
        }
        return {
          filename: doc.fileName || doc.filename || "attachment",
          path: downloadUrl,
        };
      })
    );

    const validAttachments = mailAttachments.filter((a) => Boolean(a.path));

    await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject: subject.trim(),
      text: body.trim(),
      ...(validAttachments.length > 0 && { attachments: validAttachments }),
    });

    // Record email communication history in EmailLog
    await prisma.emailLog.create({
      data: {
        subject: subject.trim(),
        body: body.trim(),
        sentTo: recipientEmail,
        orderId: params.id,
      },
    });

    // Log the audit event
    await logAction(
      "ORDER",
      params.id,
      "EMAIL_SENT",
      `Emailed Client: "${subject.trim()}"${
        validAttachments.length > 0
          ? ` with ${validAttachments.length} attachment(s)`
          : ""
      }`,
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
