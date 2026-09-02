import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const DEFAULT_SUBJECT = "Follow-up regarding your Survey Proposal for {{clientName}}";
const DEFAULT_BODY = `Hello {{clientName}},

We wanted to follow up on the survey proposal prepared for you. You can review your detailed estimate and proposal terms directly at the link below:

{{quoteLink}}

Please let us know if you have any questions, require modifications, or are ready to proceed with scheduling your survey.

Best regards,
MJS Land Surveying Team`;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasAdminAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    let template = await (prisma as any).emailTemplate.findUnique({
      where: { type: "QUOTE_FOLLOW_UP" },
    });

    if (!template) {
      template = await (prisma as any).emailTemplate.create({
        data: {
          type: "QUOTE_FOLLOW_UP",
          subject: DEFAULT_SUBJECT,
          body: DEFAULT_BODY,
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
    const { subject, body } = await req.json();

    if (!subject || !body) {
      return NextResponse.json(
        { error: "Subject and body are required" },
        { status: 400 }
      );
    }

    const updated = await (prisma as any).emailTemplate.upsert({
      where: { type: "QUOTE_FOLLOW_UP" },
      update: {
        subject: subject.trim(),
        body: body.trim(),
      },
      create: {
        type: "QUOTE_FOLLOW_UP",
        subject: subject.trim(),
        body: body.trim(),
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
