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
    const timesheets = await prisma.timesheet.findMany({
      include: {
        user: true,
        order: {
          select: {
            orderNumber: true,
            clientName: true,
            address: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    const flattened = timesheets.map((ts) => ({
      "Timesheet ID": ts.id,
      "Log Date": new Date(ts.date).toLocaleDateString(),
      "Employee Name": ts.user.name,
      "Employee Email": ts.user.email,
      "Employee Role": ts.user.role,
      "Order Number": ts.order.orderNumber,
      "Client Name": ts.order.clientName,
      "Job Address": `${ts.order.address}, ${ts.order.city}, ${ts.order.state}`,
      "Hours": Number(ts.hours),
      "Work Category": ts.workType,
      "Notes & Log": ts.notes || "",
      "Recorded At": new Date(ts.createdAt).toLocaleDateString(),
    }));

    return NextResponse.json(flattened);
  } catch (error) {
    console.error("Failed to export timesheets:", error);
    return NextResponse.json(
      { error: "Failed to export timesheets" },
      { status: 500 }
    );
  }
}
