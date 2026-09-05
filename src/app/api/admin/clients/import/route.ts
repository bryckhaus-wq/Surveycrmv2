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

    const parsed = Papa.parse<Record<string, any>>(fileString, {
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

    const parsedData = parsed.data;
    let importedCount = 0;
    let skippedCount = 0;

    for (const row of parsedData) {
      const clientName = (row.ClientName || row["Client Name"] || row.clientName || row.name || "").trim();
      if (!clientName) continue; // Skip empty rows

      // Combine address fields into a single string if your schema uses one address field
      const fullAddress = [
        row.ClientAddress || row.clientAddress || row.Address,
        row.ClientAddress2 || row.clientAddress2 || row.Address2,
        row.ClientCity || row.clientCity || row.City,
        row.ClientState || row.clientState || row.State,
        row.ClientZip || row.clientZip || row.Zip,
      ]
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean)
        .join(", ");

      // Compile legacy metadata into notes
      const clientRefNumber = row.clientRefNumber || row.ClientRefNumber || row.clientRef;
      const spoke = row.Spoke || row.spoke;
      const apContact = row.APContact || row.apContact || row["AP Contact"];
      const decisionMaker = row.DecisionMaker || row.decisionMaker || row["Decision Maker"];
      const businessType = row.businessType || row.BusinessType || row["Business Type"];
      const miscComn = row.MiscComn || row.miscComn || row.Comments || row.comments || row.MiscComments;

      const legacyNotes = [
        clientRefNumber ? `Ref #: ${clientRefNumber}` : "",
        spoke ? `Legacy Spoke: ${spoke}` : "",
        apContact ? `AP Contact: ${apContact}` : "",
        decisionMaker ? `Decision Maker: ${decisionMaker}` : "",
        businessType ? `Business Type: ${businessType}` : "",
        miscComn ? `Comments: ${miscComn}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const email = (row.ClientEmail || row.clientEmail || row.Email || row.email || "").trim();
      const phone = (
        row.ClientPhone ||
        row.clientPhone ||
        row.Phone ||
        row.phone ||
        row.cellPhone ||
        row.CellPhone ||
        ""
      ).trim();

      // Use upsert or findFirst to prevent duplicating clients if they already exist
      const existingClient = await prisma.client.findFirst({
        where: {
          OR: [
            { email: email || "NO_MATCH" },
            { name: clientName },
          ],
        },
      });

      if (!existingClient) {
        await prisma.client.create({
          data: {
            name: clientName,
            email: email || null,
            phone: phone || null,
            address: fullAddress || null,
            clientType: (businessType && typeof businessType === "string" ? businessType.trim() : null) || "Self Pay",
            specialInstructions: legacyNotes || null,
          },
        });
        importedCount++;
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      count: importedCount,
      skipped: skippedCount,
      total: parsedData.length,
      message: `Successfully imported ${importedCount} client records (${skippedCount} duplicates/existing skipped).`,
    });
  } catch (error: any) {
    console.error("Failed to import legacy clients CSV:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to import legacy clients CSV" },
      { status: 500 }
    );
  }
}
