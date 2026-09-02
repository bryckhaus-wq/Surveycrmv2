import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFinancialAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

interface GroupStats {
  name: string;
  quotes: number;
  quoteAmt: number;
  won: number;
  wonAmt: number;
  lost: number;
  lostAmt: number;
  open: number;
  openAmt: number;
  winRate: number;
}

function createEmptyStats(name: string): GroupStats {
  return {
    name,
    quotes: 0,
    quoteAmt: 0,
    won: 0,
    wonAmt: 0,
    lost: 0,
    lostAmt: 0,
    open: 0,
    openAmt: 0,
    winRate: 0,
  };
}

function accumulateQuote(stats: GroupStats, price: number, status: string) {
  const normalizedStatus = (status || "NEW").toUpperCase();
  stats.quotes += 1;
  stats.quoteAmt += price;

  if (normalizedStatus === "WON") {
    stats.won += 1;
    stats.wonAmt += price;
  } else if (normalizedStatus === "LOST") {
    stats.lost += 1;
    stats.lostAmt += price;
  } else {
    stats.open += 1;
    stats.openAmt += price;
  }

  stats.winRate = stats.quotes > 0 ? Math.round((stats.won / stats.quotes) * 100) : 0;
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

    const clientMap = new Map<string, GroupStats>();
    const spokeMap = new Map<string, GroupStats>();
    const marketerMap = new Map<string, GroupStats>();

    let totalQuotes = 0;
    let totalQuoteAmt = 0;
    let totalWon = 0;
    let totalWonAmt = 0;
    let totalLost = 0;
    let totalLostAmt = 0;
    let totalOpen = 0;
    let totalOpenAmt = 0;

    for (const q of quotes) {
      const price = Number(q.price) || 0;
      const status = q.status || "NEW";
      const normalizedStatus = status.toUpperCase();

      totalQuotes += 1;
      totalQuoteAmt += price;
      if (normalizedStatus === "WON") {
        totalWon += 1;
        totalWonAmt += price;
      } else if (normalizedStatus === "LOST") {
        totalLost += 1;
        totalLostAmt += price;
      } else {
        totalOpen += 1;
        totalOpenAmt += price;
      }

      // 1. Client Aggregation
      const clientKey = q.clientId || q.clientName || "Direct / Unknown";
      const clientName = q.client?.name || q.clientName || "Direct / Unknown";
      if (!clientMap.has(clientKey)) {
        clientMap.set(clientKey, createEmptyStats(clientName));
      }
      accumulateQuote(clientMap.get(clientKey)!, price, status);

      // 2. Spoke Aggregation
      const spokeKey = q.spokeId || "unassigned";
      const spokeName = q.spoke ? `${q.spoke.shortName} - ${q.spoke.name}` : "Unassigned Branch";
      if (!spokeMap.has(spokeKey)) {
        spokeMap.set(spokeKey, createEmptyStats(spokeName));
      }
      accumulateQuote(spokeMap.get(spokeKey)!, price, status);

      // 3. Marketer Aggregation
      const marketerKey = q.marketerId || "direct";
      const marketerName = q.marketer ? q.marketer.name : "Direct / No Marketer";
      if (!marketerMap.has(marketerKey)) {
        marketerMap.set(marketerKey, createEmptyStats(marketerName));
      }
      accumulateQuote(marketerMap.get(marketerKey)!, price, status);
    }

    const clientStats = Array.from(clientMap.values()).sort((a, b) => b.quotes - a.quotes);
    const spokeStats = Array.from(spokeMap.values()).sort((a, b) => b.quotes - a.quotes);
    const marketerStats = Array.from(marketerMap.values()).sort((a, b) => b.quotes - a.quotes);

    const globalConversionRate = totalQuotes > 0 ? Math.round((totalWon / totalQuotes) * 100) : 0;

    const grandTotal: GroupStats = {
      name: "Total",
      quotes: totalQuotes,
      quoteAmt: totalQuoteAmt,
      won: totalWon,
      wonAmt: totalWonAmt,
      lost: totalLost,
      lostAmt: totalLostAmt,
      open: totalOpen,
      openAmt: totalOpenAmt,
      winRate: globalConversionRate,
    };

    return NextResponse.json({
      globalConversionRate,
      clientStats,
      spokeStats,
      marketerStats,
      spokeTotal: grandTotal,
      marketerTotal: grandTotal,
      clientTotal: grandTotal,
      totals: {
        totalQuotes,
        totalQuoteAmt,
        totalWon,
        totalWonAmt,
        totalLost,
        totalLostAmt,
        totalOpen,
        totalOpenAmt,
      },
    });
  } catch (error: any) {
    console.error("Failed to generate quotes report:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate quotes report" },
      { status: 500 }
    );
  }
}
