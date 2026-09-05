import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const userRole = session.user.role;
    const userId = session.user.id;

    if (userRole === "ADMIN") {
      const timesheets = await prisma.timesheet.findMany({
        include: {
          user: true,
        },
        orderBy: {
          clockIn: "desc",
        },
      });
      return NextResponse.json(timesheets);
    } else {
      const timesheets = await prisma.timesheet.findMany({
        where: {
          userId,
        },
        include: {
          user: true,
        },
        orderBy: {
          clockIn: "desc",
        },
      });
      return NextResponse.json(timesheets);
    }
  } catch (error) {
    console.error("Failed to fetch timesheets:", error);
    return NextResponse.json(
      { error: "Failed to fetch timesheets" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { notes } = body;

    const timesheet = await prisma.timesheet.create({
      data: {
        userId: session.user.id,
        clockIn: new Date(),
        notes: notes ? notes.trim() : null,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(timesheet, { status: 201 });
  } catch (error) {
    console.error("Failed to clock in:", error);
    return NextResponse.json(
      { error: "Failed to clock in" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { timesheetId, notes } = body;

    let targetTimesheetId = timesheetId;

    if (!targetTimesheetId) {
      const activeTimesheet = await prisma.timesheet.findFirst({
        where: {
          userId: session.user.id,
          clockOut: null,
        },
        orderBy: {
          clockIn: "desc",
        },
      });

      if (!activeTimesheet) {
        return NextResponse.json(
          { error: "No active clock-in session found to clock out from." },
          { status: 404 }
        );
      }

      targetTimesheetId = activeTimesheet.id;
    }

    const updated = await prisma.timesheet.update({
      where: {
        id: targetTimesheetId,
      },
      data: {
        clockOut: new Date(),
        ...(notes !== undefined && { notes: notes ? notes.trim() : null }),
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to clock out:", error);
    return NextResponse.json(
      { error: "Failed to clock out" },
      { status: 500 }
    );
  }
}
