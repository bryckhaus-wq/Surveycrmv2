import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const { county, state, label, url } = body;

    const dataToUpdate: any = {};
    if (county !== undefined) dataToUpdate.county = typeof county === "string" ? county.trim() : county;
    if (state !== undefined) dataToUpdate.state = typeof state === "string" && state.trim() ? state.trim().toUpperCase() : null;
    if (label !== undefined) dataToUpdate.label = typeof label === "string" ? label.trim() : label;
    if (url !== undefined) dataToUpdate.url = typeof url === "string" ? url.trim() : url;

    const updated = await prisma.countyLink.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to update county link:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update county link" },
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

  try {
    await prisma.countyLink.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "County link deleted successfully",
    });
  } catch (error: any) {
    console.error("Failed to delete county link:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete county link" },
      { status: 500 }
    );
  }
}
