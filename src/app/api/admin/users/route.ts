import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hasAdminAccess } from "@/lib/rbac";
import bcrypt from "bcrypt";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL?.toLowerCase().trim();
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    const defaultAdminName = process.env.DEFAULT_ADMIN_NAME || "System Administrator";

    // Auto-provision default admin in DB if configured in environment and not yet present
    if (defaultAdminEmail && defaultAdminPassword) {
      const existing = await prisma.user.findUnique({
        where: { email: defaultAdminEmail },
      });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
        await prisma.user.create({
          data: {
            email: defaultAdminEmail,
            name: defaultAdminName,
            role: Role.ADMIN,
            isActive: true,
            password: hashedPassword,
          },
        });
      }
    }

    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      include: {
        spoke: true,
        _count: {
          select: {
            assignedQuotes: true,
            assignedOrders: true,
          },
        },
      },
    });

    const enrichedUsers = users.map((u) => ({
      ...u,
      isProtected: Boolean(defaultAdminEmail && u.email.toLowerCase() === defaultAdminEmail),
    }));

    return NextResponse.json(enrichedUsers);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
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
      email,
      role,
      isActive,
      commissionRate,
      spokeId,
      address,
      latitude,
      longitude,
    } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Name, email, and role are required" },
        { status: 400 }
      );
    }

    if (!Object.values(Role).includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${Object.values(Role).join(", ")}` },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role,
        isActive: isActive ?? true,
        commissionRate: commissionRate !== undefined ? parseFloat(commissionRate) : 10.0,
        spokeId: spokeId || null,
        address: address ? address.trim() : null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
      include: {
        spoke: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
