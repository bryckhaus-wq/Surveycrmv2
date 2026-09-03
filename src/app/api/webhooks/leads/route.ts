import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      firstName = "",
      lastName = "",
      email = "",
      phone = "",
      address = "",
      notes = "",
      spokeId,
    } = body;

    // Find or create the generic 'Self Pay Web' client
    let client = await prisma.client.findFirst({
      where: { name: "Self Pay Web" },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: "Self Pay Web",
          email: "selfpay@website.local",
        },
      });
    }

    const combinedNotes = `Web Lead Contact: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone}

Notes: ${notes}`;

    // Handle address formatting
    let formattedAddress = "";
    let city = "Unknown";
    let state = "NY";
    let zip = "00000";

    if (typeof address === "string") {
      formattedAddress = address.trim();
      const parts = address.split(",").map((p) => p.trim());
      if (parts.length >= 3) {
        city = parts[1] || city;
        const stateZip = parts[2].trim().split(" ");
        if (stateZip.length >= 1) state = stateZip[0] || state;
        if (stateZip.length >= 2) zip = stateZip[1] || zip;
      }
    } else if (address && typeof address === "object") {
      formattedAddress = (address.formatted_address || address.street || address.address || "").trim();
      city = address.city || city;
      state = address.state || state;
      zip = address.zip || zip;
    }

    if (!formattedAddress) {
      formattedAddress = "Pending Address";
    }

    if (body.city) city = body.city;
    if (body.state) state = body.state;
    if (body.zip) zip = body.zip;

    // Resolve default survey type
    let surveyTypeId = body.surveyTypeId;
    if (!surveyTypeId) {
      const defaultSurveyType = await prisma.surveyType.findFirst();
      surveyTypeId = defaultSurveyType?.id || "";
    }

    // Resolve target spoke/branch if provided
    let targetSpokeId = spokeId || null;
    if (targetSpokeId) {
      const spokeExists = await prisma.spoke.findUnique({
        where: { id: targetSpokeId },
      });
      if (!spokeExists) {
        targetSpokeId = null;
      }
    }
    if (!targetSpokeId) {
      const firstSpoke = await prisma.spoke.findFirst();
      targetSpokeId = firstSpoke?.id || null;
    }

    // Create the quote record attached to the generic client with status PENDING
    const quote = await prisma.quote.create({
      data: {
        clientId: client.id,
        clientName: client.name,
        clientEmail: email || client.email,
        clientPhone: phone || null,
        address: formattedAddress,
        city,
        state,
        zip,
        surveyTypeId,
        spokeId: targetSpokeId,
        status: "NEW",
        customScope: combinedNotes,
      },
    });

    // Retain audit entry for the created quote
    await logAction(
      "QUOTE",
      quote.id,
      "LEAD_WEBHOOK_RECEIVED",
      `New web lead quote created via webhook for ${firstName} ${lastName}`.trim(),
      ""
    );

    return NextResponse.json(
      {
        success: true,
        quoteId: quote.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Failed to process lead webhook:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process lead webhook" },
      { status: 500 }
    );
  }
}
