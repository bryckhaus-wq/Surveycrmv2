import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasClientAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasClientAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const orders = await prisma.order.findMany({
      where: {
        status: "COMPLETED",
      },
      include: {
        client: true,
        spoke: true,
        assignedUser: true,
        surveyType: true,
        quote: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const flattened = orders.map((o) => ({
      "Order Number": o.orderNumber,
      "Client Name": o.clientName,
      "Client Email": o.client?.email || "",
      "Client Phone": o.client?.phone || "",
      "Client Type": o.client?.clientType || "Standard",
      "Job Address": o.address,
      "City": o.city,
      "State": o.state,
      "Zip Code": o.zip,
      "Survey Type": o.surveyType?.name || "",
      "Branch": o.spoke ? `${o.spoke.shortName} - ${o.spoke.name}` : "Main HQ",
      "Assigned Specialist": o.assignedUser?.name || "Unassigned",
      "Specialist Role": o.assignedUser?.role || "",
      "Price ($)": o.quote?.price ? Number(o.quote.price).toFixed(2) : "0.00",
      "Status": o.status,
      "Created Date": new Date(o.createdAt).toLocaleDateString(),
    }));

    return NextResponse.json(flattened);
  } catch (error) {
    console.error("Failed to export completed orders:", error);
    return NextResponse.json(
      { error: "Failed to export orders" },
      { status: 500 }
    );
  }
}
