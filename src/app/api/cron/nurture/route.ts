import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleCron(req);
}

export async function GET(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  // Authorization verification against CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (
    !cronSecret ||
    (authHeader !== `Bearer ${cronSecret}` &&
      authHeader !== cronSecret &&
      req.headers.get("x-cron-secret") !== cronSecret)
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // =========================================================================
    // TASK A: Auto-Close Stale Quotes (> 14 days old and pending / new)
    // =========================================================================
    const staleQuotes = await prisma.quote.findMany({
      where: {
        status: { in: ["PENDING", "NEW"] },
        createdAt: { lte: fourteenDaysAgo },
      },
      select: {
        id: true,
        quoteNumber: true,
        assignedCsrId: true,
      },
    });

    let autoClosedCount = 0;
    for (const quote of staleQuotes) {
      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: "LOST" },
      });

      await logAction(
        "QUOTE",
        quote.id,
        "STATUS_CHANGE",
        `System auto-closed stale quote #${quote.quoteNumber} after 14 days`,
        quote.assignedCsrId || ""
      );
      autoClosedCount++;
    }

    // =========================================================================
    // TASK B: 48-Hour Follow-Up Email Nurture
    // =========================================================================
    const quotesNeedingFollowUp = await prisma.quote.findMany({
      where: {
        status: { in: ["PENDING", "NEW"] },
        createdAt: { lte: fortyEightHoursAgo },
        followUpSentAt: null,
      },
      include: {
        client: true,
        csr: true,
      },
    });

    // Fetch Email Template
    let template = await (prisma as any).emailTemplate.findUnique({
      where: { type: "QUOTE_FOLLOW_UP" },
    });

    const defaultSubject = "Follow-up regarding your Survey Proposal for {{clientName}}";
    const defaultBody = `Hello {{clientName}},

We wanted to follow up on the survey proposal prepared for you. You can review your detailed estimate and proposal terms directly at the link below:

{{quoteLink}}

Please let us know if you have any questions or are ready to proceed with scheduling your survey.

Best regards,
MJS Land Surveying Team`;

    const templateSubject = template?.subject || defaultSubject;
    const templateBody = template?.body || defaultBody;

    // Transporter setup
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

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://sls.bryckhouse.com";

    let followUpsSentCount = 0;

    for (const quote of quotesNeedingFollowUp) {
      const recipientEmail = quote.clientEmail || quote.client?.email;
      const quoteLink = `${baseUrl}/quotes/${quote.id}`;

      const customizedSubject = templateSubject
        .replace(/{{clientName}}/g, quote.clientName || "Valued Client")
        .replace(/{{quoteLink}}/g, quoteLink);

      const customizedBody = templateBody
        .replace(/{{clientName}}/g, quote.clientName || "Valued Client")
        .replace(/{{quoteLink}}/g, quoteLink);

      if (recipientEmail) {
        try {
          await transporter.sendMail({
            from: fromAddress,
            to: recipientEmail,
            subject: customizedSubject,
            text: customizedBody,
          });
        } catch (emailErr) {
          console.error(`Failed to dispatch follow-up email for quote #${quote.quoteNumber}:`, emailErr);
        }
      }

      await prisma.quote.update({
        where: { id: quote.id },
        data: { followUpSentAt: new Date() },
      });

      await logAction(
        "QUOTE",
        quote.id,
        "FOLLOW_UP_SENT",
        "System sent automated follow-up email",
        quote.assignedCsrId || ""
      );

      followUpsSentCount++;
    }

    return NextResponse.json({
      success: true,
      autoClosedCount,
      followUpsSentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron nurture task error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal cron execution failed" },
      { status: 500 }
    );
  }
}
