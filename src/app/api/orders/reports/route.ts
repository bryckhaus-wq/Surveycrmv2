import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFinancialAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

interface OrderGroupStats {
  name: string;
  totalJobs: number;
  jobAmt: number;
  completed: number;
  completedAmt: number;
  cancelled: number;
  cancelledAmt: number;
  pending: number;
  pendingAmt: number;
  completionRate: number;
}

function createEmptyOrderStats(name: string): OrderGroupStats {
  return {
    name,
    totalJobs: 0,
    jobAmt: 0,
    completed: 0,
    completedAmt: 0,
    cancelled: 0,
    cancelledAmt: 0,
    pending: 0,
    pendingAmt: 0,
    completionRate: 0,
  };
}

function accumulateOrder(stats: OrderGroupStats, price: number, status: string) {
  const normalizedStatus = (status || "").toUpperCase();
  stats.totalJobs += 1;
  stats.jobAmt += price;

  if (normalizedStatus === "COMPLETED") {
    stats.completed += 1;
    stats.completedAmt += price;
  } else if (normalizedStatus === "CANCELLED") {
    stats.cancelled += 1;
    stats.cancelledAmt += price;
  } else {
    // All active/in-progress statuses (FIELD_PENDING, DRAFTING, REVIEW, etc.)
    stats.pending += 1;
    stats.pendingAmt += price;
  }

  stats.completionRate = stats.totalJobs > 0 ? Math.round((stats.completed / stats.totalJobs) * 100) : 0;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

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

    const orders = await prisma.order.findMany({
      where,
      include: {
        surveyType: true,
        assignedUser: { select: { id: true, name: true, email: true } },
        marketer: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true, phone: true } },
        spoke: { select: { id: true, name: true, shortName: true } },
        quote: { select: { id: true, quoteNumber: true, price: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const clientMap = new Map<string, OrderGroupStats>();
    const spokeMap = new Map<string, OrderGroupStats>();
    const marketerMap = new Map<string, OrderGroupStats>();

    let totalJobs = 0;
    let totalJobAmt = 0;
    let totalCompleted = 0;
    let totalCompletedAmt = 0;
    let totalCancelled = 0;
    let totalCancelledAmt = 0;
    let totalPending = 0;
    let totalPendingAmt = 0;

    for (const order of orders) {
      const price = Number(order.quote?.price ?? order.surveyType?.defaultPrice ?? 0);
      const status = order.status || "FIELD_PENDING";
      const normalizedStatus = status.toUpperCase();

      totalJobs += 1;
      totalJobAmt += price;

      if (normalizedStatus === "COMPLETED") {
        totalCompleted += 1;
        totalCompletedAmt += price;
      } else if (normalizedStatus === "CANCELLED") {
        totalCancelled += 1;
        totalCancelledAmt += price;
      } else {
        totalPending += 1;
        totalPendingAmt += price;
      }

      // 1. Client Aggregation
      const clientKey = order.clientId || order.clientName || "Direct / Unknown";
      const clientName = order.client?.name || order.clientName || "Direct / Unknown";
      if (!clientMap.has(clientKey)) {
        clientMap.set(clientKey, createEmptyOrderStats(clientName));
      }
      accumulateOrder(clientMap.get(clientKey)!, price, status);

      // 2. Spoke Aggregation
      const spokeKey = order.spokeId || "unassigned";
      const spokeName = order.spoke ? `${order.spoke.shortName} - ${order.spoke.name}` : "Unassigned Branch";
      if (!spokeMap.has(spokeKey)) {
        spokeMap.set(spokeKey, createEmptyOrderStats(spokeName));
      }
      accumulateOrder(spokeMap.get(spokeKey)!, price, status);

      // 3. Marketer Aggregation
      const marketerKey = order.marketerId || "direct";
      const marketerName = order.marketer ? order.marketer.name : "Direct / No Marketer";
      if (!marketerMap.has(marketerKey)) {
        marketerMap.set(marketerKey, createEmptyOrderStats(marketerName));
      }
      accumulateOrder(marketerMap.get(marketerKey)!, price, status);
    }

    const clientStats = Array.from(clientMap.values()).sort((a, b) => b.totalJobs - a.totalJobs);
    const spokeStats = Array.from(spokeMap.values()).sort((a, b) => b.totalJobs - a.totalJobs);
    const marketerStats = Array.from(marketerMap.values()).sort((a, b) => b.totalJobs - a.totalJobs);

    const globalCompletionRate = totalJobs > 0 ? Math.round((totalCompleted / totalJobs) * 100) : 0;

    const grandTotal: OrderGroupStats = {
      name: "Total",
      totalJobs,
      jobAmt: totalJobAmt,
      completed: totalCompleted,
      completedAmt: totalCompletedAmt,
      cancelled: totalCancelled,
      cancelledAmt: totalCancelledAmt,
      pending: totalPending,
      pendingAmt: totalPendingAmt,
      completionRate: globalCompletionRate,
    };

    return NextResponse.json({
      globalCompletionRate,
      clientStats,
      spokeStats,
      marketerStats,
      spokeTotal: grandTotal,
      marketerTotal: grandTotal,
      clientTotal: grandTotal,
      totals: {
        totalJobs,
        totalJobAmt,
        totalCompleted,
        totalCompletedAmt,
        totalCancelled,
        totalCancelledAmt,
        totalPending,
        totalPendingAmt,
      },
    });
  } catch (error: any) {
    console.error("Failed to generate order report:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate order report" },
      { status: 500 }
    );
  }
}
