import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const orderId = searchParams.get("orderId");

    const timesheets = await prisma.timesheet.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(orderId ? { orderId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            clientName: true,
            address: true,
            status: true,
            surveyType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(timesheets);
  } catch (error) {
    console.error("Failed to fetch timesheets:", error);
    return NextResponse.json(
      { error: "Failed to fetch timesheets" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, orderId, date, hours, workType, notes } = body;

    if (!userId || !orderId || !date || hours === undefined || !workType) {
      return NextResponse.json(
        { error: "userId, orderId, date, hours, and workType are required" },
        { status: 400 }
      );
    }

    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      return NextResponse.json(
        { error: "Hours must be a valid positive number" },
        { status: 400 }
      );
    }

    const timesheet = await prisma.timesheet.create({
      data: {
        userId,
        orderId,
        date: new Date(date),
        hours: parsedHours,
        workType,
        notes: notes || null,
      },
      include: {
        user: true,
        order: true,
      },
    });

    return NextResponse.json(timesheet, { status: 201 });
  } catch (error) {
    console.error("Failed to create timesheet entry:", error);
    return NextResponse.json(
      { error: "Failed to create timesheet entry" },
      { status: 500 }
    );
  }
}
