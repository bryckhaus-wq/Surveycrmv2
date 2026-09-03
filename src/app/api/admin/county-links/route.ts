import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const county = searchParams.get("county");
    const state = searchParams.get("state");

    const where: any = {};
    if (county) {
      where.county = {
        contains: county.trim(),
        mode: "insensitive",
      };
    }
    if (state) {
      where.state = {
        equals: state.trim().toUpperCase(),
        mode: "insensitive",
      };
    }

    const countyLinks = await prisma.countyLink.findMany({
      where,
      orderBy: [{ county: "asc" }, { label: "asc" }],
    });

    return NextResponse.json(countyLinks);
  } catch (error: any) {
    console.error("Failed to fetch county links:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch county links" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const { county, state, label, url } = body;

    if (!county || !label || !url) {
      return NextResponse.json(
        { error: "County, Label, and URL are required" },
        { status: 400 }
      );
    }

    const countyLink = await prisma.countyLink.create({
      data: {
        county: county.trim(),
        state: state ? state.trim().toUpperCase() : null,
        label: label.trim(),
        url: url.trim(),
      },
    });

    return NextResponse.json(countyLink, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create county link:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create county link" },
      { status: 500 }
    );
  }
}
