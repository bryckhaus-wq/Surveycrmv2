import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/rbac";
import bcrypt from "bcrypt";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasAdminAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || typeof newPassword !== "string" || !newPassword.trim()) {
      return NextResponse.json(
        { error: "New password is required" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for user ${user.name}`,
    });
  } catch (error: any) {
    console.error("Failed to reset password:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
