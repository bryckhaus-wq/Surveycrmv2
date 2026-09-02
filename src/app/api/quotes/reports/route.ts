import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFinancialAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Require ADMIN or CSR (or financial access)
  if (!hasFinancialAccess(session.user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const spokeId = searchParams.get("spokeId");

    const where: any = {};

    if (startDateParam || endDateParam) {
      where.createdAt = {};
      if (startDateParam) {
        const start = new Date(startDateParam);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (spokeId && spokeId !== "ALL") {
      where.spokeId = spokeId;
    }

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        surveyType: true,
        csr: { select: { id: true, name: true, email: true } },
        marketer: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true, phone: true } },
        spoke: { select: { id: true, name: true, shortName: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalQuotes = quotes.length;
    let wonCount = 0;
    let lostCount = 0;
    let openCount = 0;
    let commissionableCount = 0;
    let totalWonAmount = 0;
    let totalQuotedAmount = 0;

    const statusCounts: Record<string, number> = {};

    quotes.forEach((q) => {
      const priceNum = Number(q.price) || 0;
      totalQuotedAmount += priceNum;

      const normalizedStatus = (q.status || "NEW").toUpperCase();
      statusCounts[normalizedStatus] = (statusCounts[normalizedStatus] || 0) + 1;

      if (normalizedStatus === "WON") {
        wonCount += 1;
        totalWonAmount += priceNum;
      } else if (normalizedStatus === "LOST") {
        lostCount += 1;
      } else {
        openCount += 1;
      }

      if ((q as any).marketerId || (q as any).marketer) {
        commissionableCount += 1;
      }
    });

    const wonPercentage = totalQuotes > 0 ? Number(((wonCount / totalQuotes) * 100).toFixed(1)) : 0;
    const lostPercentage = totalQuotes > 0 ? Number(((lostCount / totalQuotes) * 100).toFixed(1)) : 0;
    const openPercentage = totalQuotes > 0 ? Number(((openCount / totalQuotes) * 100).toFixed(1)) : 0;

    // Follow-up quotes: open quotes (NEW, PENDING, NEEDS_FOLLOWUP, etc.)
    const followUpQuotes = quotes.filter((q) => {
      const s = (q.status || "NEW").toUpperCase();
      return s !== "WON" && s !== "LOST";
    });

    return NextResponse.json({
      totals: {
        totalQuotes,
        wonCount,
        lostCount,
        openCount,
        commissionableCount,
        totalWonAmount,
        totalQuotedAmount,
      },
      percentages: {
        wonPercentage,
        lostPercentage,
        openPercentage,
      },
      statusCounts,
      chartData: [
        { name: "Won", value: wonCount, percentage: wonPercentage, color: "#10B981" },
        { name: "Lost", value: lostCount, percentage: lostPercentage, color: "#EF4444" },
        { name: "Open / Follow-up", value: openCount, percentage: openPercentage, color: "#3B82F6" },
      ],
      followUpQuotes,
    });
  } catch (error) {
    console.error("Failed to generate quotes report:", error);
    return NextResponse.json(
      { error: "Failed to generate quotes report" },
      { status: 500 }
    );
  }
}
