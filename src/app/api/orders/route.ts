import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FIELD_WORKER, hasFinancialAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const spokeId = searchParams.get("spokeId");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const page = Math.max(parseInt(pageParam || "1", 10), 1);
    const limit = Math.max(parseInt(limitParam || "25", 10), 1);
    const skip = (page - 1) * limit;

    const isFieldWorker = session.user.role === FIELD_WORKER;

    const where: any = {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(spokeId && spokeId !== "ALL" ? { spokeId } : {}),
      ...(isFieldWorker
        ? {
            OR: [
              { status: "FIELD_PENDING" },
              { assignedUserId: session.user.id },
            ],
          }
        : {}),
    };

    const [totalCount, rawOrders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          surveyType: true,
          assignedUser: true,
          marketer: true,
          client: true,
          spoke: true,
          quote: {
            select: {
              id: true,
              quoteNumber: true,
              price: true,
              csr: true,
              marketer: true,
              client: true,
              spoke: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const orders = rawOrders.map((order) => {
      const ord: any = { ...order };
      if (!hasFinancialAccess(session.user.role) || isFieldWorker) {
        if (ord.quote) {
          const sanitizedQuote = { ...ord.quote };
          delete sanitizedQuote.price;
          ord.quote = sanitizedQuote;
        }
        if (ord.client) {
          const sanitizedClient = { ...ord.client };
          delete sanitizedClient.defaultInvoiceRules;
          ord.client = sanitizedClient;
        }
      }
      return ord;
    });

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      orders,
      metadata: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
