import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasAdminAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const spokes = await prisma.spoke.findMany({
      include: {
        _count: {
          select: {
            users: true,
            quotes: true,
            orders: true,
            assets: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(spokes);
  } catch (error) {
    console.error("Failed to fetch spokes:", error);
    return NextResponse.json(
      { error: "Failed to fetch spokes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasAdminAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const body = await req.json();
    const {
      name,
      shortName,
      address,
      city,
      state,
      zip,
      lbNumber,
      dailyCapacity,
    } = body;

    if (!name || !shortName) {
      return NextResponse.json(
        { error: "Branch Name and Short Code are required" },
        { status: 400 }
      );
    }

    const spoke = await prisma.spoke.create({
      data: {
        name: name.trim(),
        shortName: shortName.trim().toUpperCase(),
        address: address ? address.trim() : null,
        city: city ? city.trim() : null,
        state: state ? state.trim().toUpperCase() : null,
        zip: zip ? zip.trim() : null,
        lbNumber: lbNumber ? lbNumber.trim() : null,
        dailyCapacity: dailyCapacity ? parseInt(dailyCapacity, 10) : 15,
      },
    });

    return NextResponse.json(spoke, { status: 201 });
  } catch (error) {
    console.error("Failed to create spoke:", error);
    return NextResponse.json(
      { error: "Failed to create spoke" },
      { status: 500 }
    );
  }
}
