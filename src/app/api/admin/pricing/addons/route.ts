import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state");

    const addons = await prisma.pricingAddon.findMany({
      where: state ? { state: state.toUpperCase() } : undefined,
      orderBy: [{ state: "asc" }, { label: "asc" }],
    });

    return NextResponse.json(addons);
  } catch (error: any) {
    console.error("Failed to fetch pricing addons:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch pricing addons" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { state, key, label, price, isPerUnit } = body;

    if (!state || !key || !label || price === undefined) {
      return NextResponse.json(
        { error: "state, key, label, and price are required" },
        { status: 400 }
      );
    }

    const addon = await prisma.pricingAddon.create({
      data: {
        state: state.trim().toUpperCase(),
        key: key.trim().toLowerCase(),
        label: label.trim(),
        price: parseFloat(price),
        isPerUnit: Boolean(isPerUnit),
      },
    });

    return NextResponse.json(addon);
  } catch (error: any) {
    console.error("Failed to create pricing addon:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create pricing addon" },
      { status: 500 }
    );
  }
}
