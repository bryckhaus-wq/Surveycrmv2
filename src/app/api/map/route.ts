import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const spokeId = searchParams.get("spokeId");

    const userWhere: any = {
      role: Role.FIELD_WORKER,
      latitude: { not: null },
      longitude: { not: null },
      isActive: true,
    };

    const orderWhere: any = {
      status: "FIELD_PENDING",
      latitude: { not: null },
      longitude: { not: null },
    };

    if (spokeId && spokeId !== "ALL") {
      userWhere.spokeId = spokeId;
      orderWhere.spokeId = spokeId;
    }

    const [fieldWorkers, activeOrders] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        include: {
          spoke: true,
        },
      }),
      prisma.order.findMany({
        where: orderWhere,
        include: {
          surveyType: true,
          assignedUser: true,
          spoke: true,
          client: true,
        },
      }),
    ]);

    return NextResponse.json({
      fieldWorkers,
      activeOrders,
    });
  } catch (error) {
    console.error("Failed to fetch map data:", error);
    return NextResponse.json(
      { error: "Failed to fetch map data" },
      { status: 500 }
    );
  }
}
