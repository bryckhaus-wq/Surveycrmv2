import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enrichPropertyData, geocodeAddress, queryParcelData, fetchSatelliteImageBuffer, saveSatelliteImage } from "@/services/gisEnrichmentService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { address, city, state, zip, county, orderId, quoteId } = body;

    if (!address && !orderId && !quoteId) {
      return NextResponse.json(
        { error: "Address, orderId, or quoteId is required" },
        { status: 400 }
      );
    }

    if (orderId || quoteId) {
      const enriched = await enrichPropertyData({
        id: orderId || quoteId,
        entityType: orderId ? "ORDER" : "QUOTE",
        address,
        city,
        state,
        zip,
        county,
      });
      return NextResponse.json({ success: true, data: enriched });
    }

    // Direct address enrichment without DB id
    const fullAddress = [address, city, state, zip].filter(Boolean).join(", ");
    const geocode = await geocodeAddress(fullAddress);

    if (!geocode) {
      return NextResponse.json(
        { error: "Address could not be geocoded" },
        { status: 404 }
      );
    }

    const parcel = await queryParcelData(
      geocode.latitude,
      geocode.longitude,
      state || geocode.state,
      county || geocode.county
    );

    let satelliteImagePath: string | null = null;
    const imgBuf = await fetchSatelliteImageBuffer(geocode.latitude, geocode.longitude);
    if (imgBuf) {
      const saved = await saveSatelliteImage(imgBuf, `adhoc-${Date.now()}`);
      satelliteImagePath = saved.relativeUrl;
    }

    return NextResponse.json({
      success: true,
      data: {
        latitude: geocode.latitude,
        longitude: geocode.longitude,
        matchedAddress: geocode.matchedAddress,
        county: parcel?.county || geocode.county || county || null,
        state: geocode.state || state || null,
        taxParcelId: parcel?.taxParcelId || null,
        acres: parcel?.acres || null,
        primaryOwner: parcel?.primaryOwner || null,
        propertyClass: parcel?.propertyClass || null,
        satelliteImagePath,
      },
    });
  } catch (error: any) {
    console.error("GIS enrichment API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process GIS enrichment" },
      { status: 500 }
    );
  }
}
