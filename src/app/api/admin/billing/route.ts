import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Query Order records completed or active/paid within the targeted billing month
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          {
            completionDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        clientName: true,
        address: true,
        status: true,
        surveyPrice: true,
        miscAmt: true,
        discountAmt: true,
        depositPaid: true,
        finalPaymentReceived: true,
        completionDate: true,
        createdAt: true,
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            date: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate total system revenue from Payment records associated with orders
    let monthlyRevenue = 0;
    orders.forEach((o) => {
      const orderPaymentsTotal = (o.payments || []).reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
      );
      monthlyRevenue += orderPaymentsTotal;
    });

    // Pull PLATFORM_FEE_PERCENTAGE from environment (fallback to 0.75)
    const rawFeePercentage = process.env.PLATFORM_FEE_PERCENTAGE || "0.75";
    const feePercentage = parseFloat(rawFeePercentage) || 0.75;
    const baseFee = 500;
    const variableFee = parseFloat(((monthlyRevenue * feePercentage) / 100).toFixed(2));
    const totalOwed = parseFloat((baseFee + variableFee).toFixed(2));

    return NextResponse.json({
      baseFee,
      monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
      feePercentage,
      variableFee,
      totalOwed,
      month,
      year,
      ordersCount: orders.length,
      orders,
    });
  } catch (error: any) {
    console.error("Failed to calculate platform billing:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate platform billing" },
      { status: 500 }
    );
  }
}
