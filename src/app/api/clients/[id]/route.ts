import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        quotes: {
          include: {
            surveyType: true,
            csr: true,
          },
          orderBy: { createdAt: "desc" },
        },
        orders: {
          include: {
            surveyType: true,
            assignedUser: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Failed to fetch client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client details" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      address,
      clientType,
      defaultInvoiceRules,
      specialInstructions,
    } = body;

    const updatedClient = await prisma.client.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email ? email.trim() : null }),
        ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
        ...(address !== undefined && { address: address ? address.trim() : null }),
        ...(clientType !== undefined && { clientType }),
        ...(defaultInvoiceRules !== undefined && {
          defaultInvoiceRules: defaultInvoiceRules ? defaultInvoiceRules.trim() : null,
        }),
        ...(specialInstructions !== undefined && {
          specialInstructions: specialInstructions ? specialInstructions.trim() : null,
        }),
      },
      include: {
        quotes: true,
        orders: true,
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error("Failed to update client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}
