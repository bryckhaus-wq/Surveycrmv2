import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/rbac";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!hasAdminAccess(session.user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let dateFilter: { gte?: Date; lte?: Date } | undefined = undefined;
    if (startDateParam || endDateParam) {
      dateFilter = {};
      if (startDateParam) {
        dateFilter.gte = new Date(startDateParam);
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const timesheetDateFilter = dateFilter
      ? {
          ...(dateFilter.gte ? { gte: dateFilter.gte } : {}),
          ...(dateFilter.lte ? { lte: dateFilter.lte } : {}),
        }
      : { gte: thirtyDaysAgo };

    const holdStatuses: OrderStatus[] = [
      OrderStatus.HOLD_REVIEW,
      OrderStatus.HOLD_CLIENT,
      OrderStatus.HOLD_DEPOSIT_NEEDED,
      OrderStatus.HOLD_ACCESS,
      OrderStatus.HOLD_FINAL_PAYMENT_ISSUE,
    ];

    // Execute the 5 Prisma queries in parallel using Promise.all
    const [
      activeOrdersWithPayments,
      holdOrders,
      spokesWithOrders,
      timesheets,
      topClients,
    ] = await Promise.all([
      // 1. A/R Aging: Order records (including client and payments) where status is not 'COMPLETED' or 'CANCELLED'
      prisma.order.findMany({
        where: {
          status: {
            notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
          },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              paymentType: true,
              method: true,
              date: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // 2. Holds: Order records where status contains the string "HOLD"
      prisma.order.findMany({
        where: {
          status: {
            in: holdStatuses,
          },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // 3. Spoke Utilization: Spoke records (where isActive: true), including count of active orders
      prisma.spoke.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          shortName: true,
          dailyCapacity: true,
          isActive: true,
          _count: {
            select: {
              orders: {
                where: {
                  status: {
                    notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
                  },
                  ...(dateFilter ? { createdAt: dateFilter } : {}),
                },
              },
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      }),

      // 4. Labor (Custom date range or Past 30 Days): Timesheet records
      prisma.timesheet.findMany({
        where: {
          clockIn: timesheetDateFilter,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          clockIn: "desc",
        },
      }),

      // 5. VIP Clients: Client records including count of orders
      prisma.client.findMany({
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          clientType: true,
          _count: {
            select: {
              orders: {
                where: dateFilter ? { createdAt: dateFilter } : undefined,
              },
            },
          },
        },
        orderBy: {
          orders: {
            _count: "desc",
          },
        },
      }),
    ]);

    // Process A/R Aging: Calculate balanceDue = (surveyPrice + miscAmount) - sum(payments) and filter balanceDue > 0
    const arAging = activeOrdersWithPayments
      .map((order) => {
        const totalPrice = (order.surveyPrice || 0) + (order.miscAmt || 0);
        const amountPaid = (order.payments || []).reduce(
          (sum, p) => sum + (Number(p.amount) || 0),
          0
        );
        const balanceDue = Math.round((totalPrice - amountPaid) * 100) / 100;
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          clientName: order.client?.name || order.clientName || "Direct / Unknown",
          clientEmail: order.client?.email || order.clientEmail || null,
          totalPrice,
          amountPaid,
          balanceDue,
          status: order.status,
          createdAt: order.createdAt,
          estimatedDelivery: order.estimatedDelivery,
        };
      })
      .filter((order) => order.balanceDue > 0);

    // Process Holds
    const holds = holdOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      clientName: order.client?.name || order.clientName || "Direct / Unknown",
      clientEmail: order.client?.email || order.clientEmail || null,
      estimatedDelivery: order.estimatedDelivery || null,
      createdAt: order.createdAt,
    }));

    // Process Spoke Utilization
    const spokeUtilization = spokesWithOrders.map((spoke) => ({
      id: spoke.id,
      name: spoke.name,
      shortName: spoke.shortName,
      dailyCapacity: spoke.dailyCapacity,
      activeOrdersCount: spoke._count.orders,
      isOverCapacity: spoke._count.orders >= spoke.dailyCapacity,
      utilizationRate:
        spoke.dailyCapacity > 0
          ? Math.round((spoke._count.orders / spoke.dailyCapacity) * 100)
          : 0,
    }));

    // Process Labor logs
    const laborLogs = timesheets.map((ts) => ({
      id: ts.id,
      userId: ts.userId,
      userName: ts.user?.name || "Unknown User",
      userEmail: ts.user?.email || "",
      userRole: ts.user?.role || "",
      clockIn: ts.clockIn,
      clockOut: ts.clockOut,
      notes: ts.notes,
    }));

    // Process VIP Clients
    const vipClients = topClients.map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email || "No email on file",
      phone: client.phone || "",
      clientType: client.clientType,
      totalOrders: client._count.orders,
    }));

    return NextResponse.json({
      arAging,
      holds,
      spokeUtilization,
      laborLogs,
      vipClients,
    });
  } catch (error: any) {
    console.error("Failed to generate admin reports:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate admin reports" },
      { status: 500 }
    );
  }
}
