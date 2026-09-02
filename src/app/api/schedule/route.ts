import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const spokeId = searchParams.get("spokeId");

    // Default 14-day window starting today if not specified
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 13, 23, 59, 59, 999);

    const start = startDateParam ? new Date(startDateParam) : defaultStart;
    const end = endDateParam ? new Date(endDateParam) : defaultEnd;

    // Retrieve Spoke capacity
    let effectiveCapacity = 15;
    if (spokeId && spokeId !== "ALL") {
      const spoke = await prisma.spoke.findUnique({
        where: { id: spokeId },
      });
      if (spoke) {
        effectiveCapacity = spoke.dailyCapacity;
      }
    } else {
      const spokes = await prisma.spoke.findMany();
      if (spokes.length > 0) {
        effectiveCapacity = spokes.reduce((acc, s) => acc + (s.dailyCapacity || 15), 0);
      }
    }

    const where: any = {
      fieldDueDate: {
        gte: start,
        lte: end,
      },
    };

    if (spokeId && spokeId !== "ALL") {
      where.spokeId = spokeId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        surveyType: true,
        assignedUser: true,
        spoke: true,
        client: true,
      },
      orderBy: {
        fieldDueDate: "asc",
      },
    });

    // Group orders by fieldDueDate formatted as YYYY-MM-DD
    const schedule: Record<
      string,
      {
        date: string;
        count: number;
        capacity: number;
        orders: typeof orders;
      }
    > = {};

    orders.forEach((order) => {
      if (!order.fieldDueDate) return;
      const dateStr = order.fieldDueDate.toISOString().split("T")[0];
      if (!schedule[dateStr]) {
        schedule[dateStr] = {
          date: dateStr,
          count: 0,
          capacity: effectiveCapacity,
          orders: [],
        };
      }
      schedule[dateStr].count += 1;
      schedule[dateStr].orders.push(order);
    });

    return NextResponse.json({
      capacity: effectiveCapacity,
      schedule,
      orders,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Failed to fetch schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule data" },
      { status: 500 }
    );
  }
}
