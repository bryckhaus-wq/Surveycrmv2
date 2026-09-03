import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address || address.trim().length < 3) {
      return NextResponse.json([]);
    }

    const cleanAddress = address.trim();

    const [quotes, orders] = await Promise.all([
      prisma.quote.findMany({
        where: {
          address: {
            contains: cleanAddress,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          quoteNumber: true,
          address: true,
          city: true,
          state: true,
          status: true,
          clientName: true,
        },
        take: 10,
      }),
      prisma.order.findMany({
        where: {
          address: {
            contains: cleanAddress,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          orderNumber: true,
          address: true,
          city: true,
          state: true,
          status: true,
          clientName: true,
        },
        take: 10,
      }),
    ]);

    const results = [
      ...quotes.map((q) => ({
        id: q.id,
        identifier: `Quote #${q.quoteNumber}`,
        address: `${q.address}, ${q.city}, ${q.state}`,
        clientName: q.clientName,
        status: q.status,
        type: "QUOTE" as const,
      })),
      ...orders.map((o) => ({
        id: o.id,
        identifier: `Order #${o.orderNumber}`,
        address: `${o.address}, ${o.city}, ${o.state}`,
        clientName: o.clientName,
        status: o.status,
        type: "ORDER" as const,
      })),
    ];

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Failed to check address duplicates:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to check address" },
      { status: 500 }
    );
  }
}
