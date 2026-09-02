import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasAdminAccess(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const body = await req.json();
    const rawClients = Array.isArray(body) ? body : body.clients;

    if (!Array.isArray(rawClients) || rawClients.length === 0) {
      return NextResponse.json(
        { error: "Expected non-empty array of client records" },
        { status: 400 }
      );
    }

    const parsedClients = rawClients
      .map((c: any) => {
        const name =
          c.name ||
          c.Name ||
          c["Client Name"] ||
          c["client_name"] ||
          c["Company"] ||
          c["Customer"];

        if (!name || typeof name !== "string" || !name.trim()) return null;

        const email =
          c.email ||
          c.Email ||
          c["Client Email"] ||
          c["Email Address"] ||
          c["client_email"];

        const phone =
          c.phone ||
          c.Phone ||
          c["Client Phone"] ||
          c["Phone Number"] ||
          c["client_phone"];

        const address =
          c.address ||
          c.Address ||
          c["Client Address"] ||
          c["Street Address"] ||
          c["client_address"];

        const clientType =
          c.clientType ||
          c["Client Type"] ||
          c["Type"] ||
          c["client_type"] ||
          "Self Pay";

        const defaultInvoiceRules =
          c.defaultInvoiceRules ||
          c["Invoice Rules"] ||
          c["Billing Rules"] ||
          c["Default Invoice Rules"];

        const specialInstructions =
          c.specialInstructions ||
          c["Special Instructions"] ||
          c["Field Instructions"] ||
          c["Notes"];

        return {
          name: name.trim(),
          email: email && typeof email === "string" ? email.trim() : null,
          phone: phone && typeof phone === "string" ? phone.trim() : null,
          address: address && typeof address === "string" ? address.trim() : null,
          clientType: clientType && typeof clientType === "string" ? clientType.trim() : "Self Pay",
          defaultInvoiceRules: defaultInvoiceRules && typeof defaultInvoiceRules === "string" ? defaultInvoiceRules.trim() : null,
          specialInstructions: specialInstructions && typeof specialInstructions === "string" ? specialInstructions.trim() : null,
        };
      })
      .filter(Boolean);

    if (parsedClients.length === 0) {
      return NextResponse.json(
        { error: "No valid client records with names found in upload" },
        { status: 400 }
      );
    }

    const result = await prisma.client.createMany({
      data: parsedClients as any[],
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      totalParsed: parsedClients.length,
      message: `Successfully imported ${result.count} client records.`,
    });
  } catch (error) {
    console.error("Failed to bulk import clients:", error);
    return NextResponse.json(
      { error: "Failed to import client records" },
      { status: 500 }
    );
  }
}
