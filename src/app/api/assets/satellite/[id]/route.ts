import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const cleanId = id.replace(/\.png$/i, "");

    // 1. Check local public disk
    const publicFile = path.join(process.cwd(), "public", "uploads", "satellite", `${cleanId}.png`);
    if (fs.existsSync(publicFile)) {
      const buffer = await fs.promises.readFile(publicFile);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // 2. Lookup coordinates from Quote or Order
    let lat: number | null = null;
    let lon: number | null = null;

    const quote: any = await prisma.quote.findUnique({ where: { id: cleanId } });
    if (quote?.latitude && quote?.longitude) {
      lat = quote.latitude;
      lon = quote.longitude;
    } else {
      const order: any = await prisma.order.findUnique({ where: { id: cleanId } });
      if (order?.latitude && order?.longitude) {
        lat = order.latitude;
        lon = order.longitude;
      }
    }

    if (lat !== null && lon !== null) {
      const PAD = 0.0007;
      const bbox = `${lon - PAD},${lat - PAD},${lon + PAD},${lat + PAD}`;
      const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=800,600&format=png&f=image`;

      const res = await fetch(esriUrl);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);

        // Save to disk asynchronously for future requests
        try {
          const publicUploadDir = path.join(process.cwd(), "public", "uploads", "satellite");
          await fs.promises.mkdir(publicUploadDir, { recursive: true });
          await fs.promises.writeFile(publicFile, buffer);
        } catch {}

        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    return new NextResponse("Image not found", { status: 404 });
  } catch (error: any) {
    console.error("Failed to serve satellite image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
