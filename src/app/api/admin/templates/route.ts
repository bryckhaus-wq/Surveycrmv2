import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  QUOTE_FOLLOW_UP: {
    subject: "Follow-up regarding your Survey Proposal for {{clientName}}",
    body: `Hello {{clientName}},

We wanted to follow up on the survey proposal prepared for you. You can review your detailed estimate and proposal terms directly at the link below:

{{quoteLink}}

Please let us know if you have any questions, require modifications, or are ready to proceed with scheduling your survey.

Best regards,
Survey Team`,
  },
  ORDER_MANUAL_UPDATE: {
    subject: "Update regarding your survey project for {{propertyAddress}} (Order #{{orderId}})",
    body: `Hello {{clientName}},

We are writing to provide you with an update regarding your survey project for {{propertyAddress}}.

Order Details:
- Order #: {{orderId}}
- Survey Type: {{surveyType}}
- Branch: {{spokeName}}

Please feel free to reply directly to this email if you have any questions or require additional details.

Best regards,
Survey Team`,
  },
};

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "QUOTE_FOLLOW_UP";

    let template = await (prisma as any).emailTemplate.findUnique({
      where: { type },
    });

    if (!template) {
      const defaultData = DEFAULT_TEMPLATES[type] || {
        subject: `Update regarding your survey for {{clientName}}`,
        body: `Hello {{clientName}},\n\nHere is an update regarding your survey project.\n\nBest regards,\nSurvey Team`,
      };

      template = await (prisma as any).emailTemplate.create({
        data: {
          type,
          subject: defaultData.subject,
          body: defaultData.body,
        },
      });
    }

    return NextResponse.json(template);
  } catch (error: any) {
    console.error("Failed to fetch email template:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch email template" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasAdminAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const body = await req.json();
    const type = body.type || "QUOTE_FOLLOW_UP";
    const subject = body.subject;
    const templateBody = body.body;

    if (!subject || !templateBody) {
      return NextResponse.json(
        { error: "Subject and body are required" },
        { status: 400 }
      );
    }

    const updated = await (prisma as any).emailTemplate.upsert({
      where: { type },
      update: {
        subject: subject.trim(),
        body: templateBody.trim(),
      },
      create: {
        type,
        subject: subject.trim(),
        body: templateBody.trim(),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to update email template:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update email template" },
      { status: 500 }
    );
  }
}
