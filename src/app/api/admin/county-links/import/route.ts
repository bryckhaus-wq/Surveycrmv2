import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No CSV file provided in upload" },
        { status: 400 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const fileString = Buffer.from(fileBuffer).toString("utf-8");

    const parsed = Papa.parse<Record<string, string>>(fileString, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: `CSV Parsing error: ${parsed.errors[0]?.message || "Invalid CSV"}` },
        { status: 400 }
      );
    }

    const rows = parsed.data;
    let importedCount = 0;

    for (const row of rows) {
      const county = (row.County || row.county || row.COUNTY || "").trim();
      const state = (row.State || row.state || row.STATE || "").trim().toUpperCase();
      const url = (row.URL || row.url || row.Url || row.Link || row.link || "").trim();
      const label = (row.Label || row.label || row.LABEL || `${county} Property & GIS Portal`).trim();

      if (county) {
        await prisma.countyLink.create({
          data: {
            county,
            state: state || null,
            label: label || `${county} Portal`,
            url: url || "",
          },
        });
        importedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      count: importedCount,
      message: `Successfully imported ${importedCount} county link records.`,
    });
  } catch (error: any) {
    console.error("Failed to import county links CSV:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to import county links CSV" },
      { status: 500 }
    );
  }
}
