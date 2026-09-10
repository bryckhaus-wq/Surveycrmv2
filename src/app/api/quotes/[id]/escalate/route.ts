import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateQuotePrice } from "@/services/pricingEngine";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        surveyType: true,
        spoke: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const note = body.note || "";

    // Run pricing engine calculation to get the latest zone & escalation info
    const pricingResult = await calculateQuotePrice({
      quoteId: quote.id,
      state: quote.state,
      county: quote.county,
      acres: quote.deedAcres ?? quote.acres,
      latitude: quote.latitude,
      longitude: quote.longitude,
      productType: quote.surveyType?.name,
      complicatingFactors: (quote.complicatingFactors as Record<string, boolean>) || {},
    });

    const recipientEmail =
      body.toEmail ||
      pricingResult.assignedManagerEmail ||
      pricingResult.zone?.escalationEmail ||
      process.env.DEFAULT_ADMIN_EMAIL ||
      process.env.SMTP_FROM ||
      "admin@mjslandsurvey.com";

    const recipientName =
      pricingResult.assignedManager ||
      pricingResult.zone?.escalationName ||
      "Project Manager";

    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const host = process.env.SMTP_HOST || "smtp.example.com";
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";
    const fromAddress = process.env.SMTP_FROM || "quotes@mjslandsurvey.com";

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const quoteUrl = `${baseUrl}/quotes/${quote.id}`;

    const subject = `[Review Required] Quote #${quote.quoteNumber} Flagged: ${pricingResult.reason || "Over-Acreage / Scope Review"} (${quote.address})`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px;">
        <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 18px;">
          <h2 style="color: #0f172a; margin: 0 0 4px 0; font-size: 20px;">Quote Escalation Review Required</h2>
          <p style="margin: 0; color: #64748b; font-size: 13px;">A quote has been flagged for manager review by the pricing engine matrix.</p>
        </div>

        <div style="background-color: #fef3c7; border: 1px solid #fde047; padding: 14px; border-radius: 8px; margin-bottom: 18px;">
          <strong style="color: #92400e; display: block; font-size: 14px; margin-bottom: 4px;">Flagged Reason: ${pricingResult.reason || "Over-Acreage / Scope Issue"}</strong>
          <span style="color: #78350f; font-size: 13px;">${pricingResult.detail || "Parcel details exceed standard pricing bands or contain complicating factors."}</span>
        </div>

        <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 140px; border-bottom: 1px solid #f1f5f9;"><strong>Quote Number:</strong></td>
            <td style="padding: 8px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;">#${quote.quoteNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;"><strong>Property Address:</strong></td>
            <td style="padding: 8px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${quote.address || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;"><strong>Parcel Acreage:</strong></td>
            <td style="padding: 8px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${quote.deedAcres ?? quote.acres ?? "N/A"} acres</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;"><strong>Pricing Zone:</strong></td>
            <td style="padding: 8px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${pricingResult.zone?.name || "Standard Matrix"} (${quote.state || "N/A"})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;"><strong>Service / Type:</strong></td>
            <td style="padding: 8px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${quote.surveyType?.name || "Boundary Survey"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;"><strong>Client:</strong></td>
            <td style="padding: 8px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${quote.clientName || quote.client?.name || "N/A"}</td>
          </tr>
          ${
            note
              ? `<tr>
            <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;"><strong>CSR Notes:</strong></td>
            <td style="padding: 8px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${note}</td>
          </tr>`
              : ""
          }
        </table>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${quoteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; display: inline-block;">
            Open Quote in CRM & Review Pricing
          </a>
        </div>

        <p style="margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 12px;">
          Recipient: ${recipientName} (${recipientEmail}) &bull; Configured via Pricing Matrix Backend
        </p>
      </div>
    `;

    // Send email via Nodemailer
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });

        await transporter.sendMail({
          from: fromAddress,
          to: recipientEmail,
          subject,
          html: htmlBody,
        });
      } catch (mailErr) {
        console.error("Failed to send escalation email via SMTP:", mailErr);
      }
    }

    // Log to EmailLog table
    await prisma.emailLog.create({
      data: {
        subject,
        body: htmlBody,
        sentTo: recipientEmail,
        quoteId: quote.id,
      },
    });

    // Log Audit event
    await prisma.auditLog.create({
      data: {
        entityType: "QUOTE",
        entityId: quote.id,
        action: "QUOTE_ESCALATED",
        details: `Quote review dispatched to ${recipientName} (${recipientEmail}) due to: ${pricingResult.reason || "Review Required"}`,
        userId: session.user?.id || "SYSTEM",
      },
    });

    return NextResponse.json({
      success: true,
      recipient: {
        name: recipientName,
        email: recipientEmail,
      },
      reason: pricingResult.reason,
    });
  } catch (error: any) {
    console.error("Quote escalation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to escalate quote review" },
      { status: 500 }
    );
  }
}
