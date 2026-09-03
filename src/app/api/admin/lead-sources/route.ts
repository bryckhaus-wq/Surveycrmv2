import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leadSources = await prisma.leadSource.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { quotes: true },
        },
      },
    });

    return NextResponse.json(leadSources);
  } catch (error: any) {
    console.error("Failed to fetch lead sources:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch lead sources" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const { name, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Lead source name is required" },
        { status: 400 }
      );
    }

    const leadSource = await prisma.leadSource.create({
      data: {
        name: name.trim(),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json(leadSource, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create lead source:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create lead source" },
      { status: 500 }
    );
  }
}
