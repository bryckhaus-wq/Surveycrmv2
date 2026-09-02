import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/rbac";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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
      password,
    } = body;

    const dataToUpdate: any = {};

    if (name !== undefined) {
      dataToUpdate.name = name.trim();
    }
    if (email !== undefined) {
      dataToUpdate.email = email.toLowerCase().trim();
    }
    if (role !== undefined) {
      if (Object.values(Role).includes(role)) {
        dataToUpdate.role = role;
      }
    }
    if (isActive !== undefined) {
      dataToUpdate.isActive = Boolean(isActive);
    }
    if (commissionRate !== undefined) {
      dataToUpdate.commissionRate = parseFloat(commissionRate) || 0;
    }
    if (spokeId !== undefined) {
      dataToUpdate.spokeId = spokeId || null;
    }
    if (address !== undefined) {
      dataToUpdate.address = address ? address.trim() : null;
    }
    if (latitude !== undefined) {
      dataToUpdate.latitude = latitude !== null && latitude !== "" ? parseFloat(latitude) : null;
    }
    if (longitude !== undefined) {
      dataToUpdate.longitude = longitude !== null && longitude !== "" ? parseFloat(longitude) : null;
    }

    if (password && typeof password === "string" && password.trim().length > 0) {
      dataToUpdate.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        commissionRate: true,
        address: true,
        latitude: true,
        longitude: true,
        spokeId: true,
        spoke: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasAdminAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    await prisma.user.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
