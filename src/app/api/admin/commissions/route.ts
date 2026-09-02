import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFinancialAccess, MARKETER } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasFinancialAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const orderWhere: any = {
      status: "COMPLETED",
    };

    if (startDateParam || endDateParam) {
      orderWhere.createdAt = {};
      if (startDateParam) {
        const start = new Date(startDateParam);
        start.setHours(0, 0, 0, 0);
        orderWhere.createdAt.gte = start;
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        orderWhere.createdAt.lte = end;
      }
    }

    const marketers = await (prisma.user as any).findMany({
      where: {
        role: MARKETER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        commissionRate: true,
        isActive: true,
        spoke: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },
        marketedOrders: {
          where: orderWhere,
          select: {
            id: true,
            orderNumber: true,
            clientName: true,
            status: true,
            createdAt: true,
            quote: {
              select: {
                id: true,
                quoteNumber: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    let overallRevenue = 0;
    let overallCommission = 0;
    let overallCompletedJobs = 0;

    const report = marketers.map((marketer: any) => {
      const orders = marketer.marketedOrders || [];
      const completedJobsCount = orders.length;
      overallCompletedJobs += completedJobsCount;

      const totalRevenue = orders.reduce((sum: number, order: any) => {
        const price = order.quote?.price ? Number(order.quote.price) : 0;
        return sum + price;
      }, 0);
      overallRevenue += totalRevenue;

      const rate = marketer.commissionRate ?? 10.0;
      const commissionOwed = totalRevenue * (rate / 100);
      overallCommission += commissionOwed;

      return {
        id: marketer.id,
        name: marketer.name,
        email: marketer.email,
        isActive: marketer.isActive,
        spoke: marketer.spoke,
        commissionRate: rate,
        completedJobsCount,
        totalRevenue,
        commissionOwed,
        orders,
      };
    });

    return NextResponse.json({
      totals: {
        totalMarketers: marketers.length,
        totalCompletedJobs: overallCompletedJobs,
        totalRevenueGenerated: overallRevenue,
        totalCommissionsOwed: overallCommission,
      },
      marketers: report,
    });
  } catch (error: any) {
    console.error("Failed to calculate commissions:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to calculate commissions" },
      { status: 500 }
    );
  }
}
