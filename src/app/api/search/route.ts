import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface SearchResultItem {
  id: string;
  type: "CLIENT" | "QUOTE" | "ORDER";
  title: string;
  subtitle: string;
  link: string;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json([]);
    }

    const parsedNumber = parseInt(q, 10);
    const isNumber = !isNaN(parsedNumber);

    const [clients, quotes, orders] = await Promise.all([
      prisma.client.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 10,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.quote.findMany({
        where: {
          OR: [
            { address: { contains: q, mode: "insensitive" } },
            { clientName: { contains: q, mode: "insensitive" } },
            ...(isNumber ? [{ quoteNumber: parsedNumber }] : []),
          ],
        },
        include: {
          surveyType: true,
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.findMany({
        where: {
          OR: [
            { address: { contains: q, mode: "insensitive" } },
            { orderNumber: { contains: q, mode: "insensitive" } },
            { clientName: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          surveyType: true,
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const results: SearchResultItem[] = [
      ...clients.map((c) => ({
        id: c.id,
        type: "CLIENT" as const,
        title: c.name,
        subtitle: `${c.clientType || "Client"} • ${c.email || c.phone || c.address || "No contact info"}`,
        link: `/clients/${c.id}`,
      })),
      ...quotes.map((qItem) => ({
        id: qItem.id,
        type: "QUOTE" as const,
        title: `Quote #${qItem.quoteNumber} - ${qItem.clientName}`,
        subtitle: `${qItem.surveyType?.name || "Survey"} • ${qItem.address}, ${qItem.city}, ${qItem.state} • $${Number(qItem.price).toFixed(2)}`,
        link: `/quotes/${qItem.id}`,
      })),
      ...orders.map((o) => ({
        id: o.id,
        type: "ORDER" as const,
        title: `Order ${o.orderNumber} - ${o.clientName}`,
        subtitle: `${o.surveyType?.name || "Survey"} • ${o.address}, ${o.city}, ${o.state} • Status: ${o.status.replace("_", " ")}`,
        link: `/orders/${o.id}`,
      })),
    ];

    return NextResponse.json(results);
  } catch (error) {
    console.error("Global search failed:", error);
    return NextResponse.json(
      { error: "Failed to execute global search" },
      { status: 500 }
    );
  }
}
