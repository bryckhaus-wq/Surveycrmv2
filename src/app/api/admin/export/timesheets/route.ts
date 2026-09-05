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
      },
      orderBy: {
        clockIn: "desc",
      },
    });

    const flattened = timesheets.map((ts) => {
      const clockInDate = new Date(ts.clockIn);
      const clockOutDate = ts.clockOut ? new Date(ts.clockOut) : null;
      const hours = clockOutDate
        ? ((clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60 * 60)).toFixed(2)
        : "Active";

      return {
        "Timesheet ID": ts.id,
        "Employee Name": ts.user.name,
        "Employee Email": ts.user.email,
        "Employee Role": ts.user.role,
        "Clock In": clockInDate.toLocaleString(),
        "Clock Out": clockOutDate ? clockOutDate.toLocaleString() : "Still Clocked In",
        "Total Hours": hours,
        "Notes": ts.notes || "",
      };
    });

    return NextResponse.json(flattened);
  } catch (error) {
    console.error("Failed to export timesheets:", error);
    return NextResponse.json(
      { error: "Failed to export timesheets" },
      { status: 500 }
    );
  }
}
