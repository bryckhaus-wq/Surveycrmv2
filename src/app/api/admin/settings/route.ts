import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: "default",
          companyName: "Survey CRM",
          themeColor: "#0f172a",
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("Failed to fetch system settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch system settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { companyName, address, phone, email, logoUrl, themeColor } = body;

    const settings = await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        ...(companyName !== undefined && { companyName: companyName ? companyName.trim() : "Survey CRM" }),
        ...(address !== undefined && { address: address ? address.trim() : null }),
        ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
        ...(email !== undefined && { email: email ? email.trim() : null }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(themeColor !== undefined && { themeColor: themeColor || "#0f172a" }),
      },
      create: {
        id: "default",
        companyName: companyName ? companyName.trim() : "Survey CRM",
        address: address ? address.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        logoUrl: logoUrl || null,
        themeColor: themeColor || "#0f172a",
      },
    });

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("Failed to update system settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update system settings" },
      { status: 500 }
    );
  }
}
