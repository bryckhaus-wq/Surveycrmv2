import { prisma } from "@/lib/prisma";

export async function logAction(
  entityType: string,
  entityId: string,
  action: string,
  details: string,
  userId: string
) {
  try {
    if (!userId) {
      const fallbackUser = await prisma.user.findFirst();
      if (fallbackUser) {
        userId = fallbackUser.id;
      } else {
        return null;
      }
    }

    const log = await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        details,
        userId,
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
      },
    });

    return log;
  } catch (error) {
    console.error("Failed to write audit log:", error);
    return null;
  }
}
