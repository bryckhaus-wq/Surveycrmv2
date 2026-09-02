import { prisma } from "@/lib/prisma";

export async function generateNextNumber(
  spokeId: string,
  type: "QUOTE" | "ORDER"
): Promise<string> {
  const spoke = await prisma.spoke.findUnique({
    where: { id: spokeId },
  });

  const shortName = (spoke?.shortName || "GEN").toUpperCase();
  const now = new Date();
  const fullYear = now.getFullYear();
  const year2Digit = fullYear.toString().slice(-2);

  const tracker = await prisma.sequenceTracker.upsert({
    where: {
      spokeId_year_type: {
        spokeId,
        year: fullYear,
        type,
      },
    },
    update: {
      lastValue: {
        increment: 1,
      },
    },
    create: {
      spokeId,
      year: fullYear,
      type,
      lastValue: 1,
    },
  });

  const paddedNumber = tracker.lastValue.toString().padStart(3, "0");
  return `${shortName}-${year2Digit}-${paddedNumber}`;
}
