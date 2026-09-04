import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { amount, method, date } = body;

    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount. Amount must be greater than 0." },
        { status: 400 }
      );
    }

    if (!method || typeof method !== "string" || !method.trim()) {
      return NextResponse.json(
        { error: "Payment method is required." },
        { status: 400 }
      );
    }

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, orderNumber: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const paymentDate = date ? new Date(date) : new Date();

    const payment = await prisma.payment.create({
      data: {
        amount: parsedAmount,
        method: method.trim(),
        date: paymentDate,
        orderId: id,
      },
    });

    if (session.user?.id) {
      await logAction(
        "ORDER",
        id,
        "PAYMENT_RECORDED",
        `Payment of $${parsedAmount.toFixed(2)} recorded via ${method.trim()}`,
        session.user.id
      );
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create payment record:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create payment record" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const payments = await prisma.payment.findMany({
      where: { orderId: params.id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error: any) {
    console.error("Failed to fetch payments:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
