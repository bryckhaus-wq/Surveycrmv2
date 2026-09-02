import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get("placeId");

    if (!placeId) {
      return NextResponse.json(
        { error: "placeId query parameter is required" },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey.includes("Placeholder")) {
      return NextResponse.json(
        { error: "Google Maps API Key not configured on server" },
        { status: 503 }
      );
    }

    const referer = req.headers.get("referer") || undefined;

    // Google Places API (New) Place Details endpoint
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "id,formattedAddress,addressComponents,location,displayName",
          ...(referer ? { Referer: referer } : {}),
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Places API details returned status:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to fetch place details", details: errText },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Normalize for both Google Maps JS SDK legacy format and Places API (New) format
    const formattedAddress = data.formattedAddress || "";
    const addressComponents = (data.addressComponents || []).map((c: any) => ({
      long_name: c.longText || c.long_name || "",
      short_name: c.shortText || c.short_name || "",
      types: c.types || [],
    }));

    const lat = data.location?.latitude ?? null;
    const lng = data.location?.longitude ?? null;

    return NextResponse.json({
      id: data.id,
      place_id: data.id,
      formatted_address: formattedAddress,
      formattedAddress: formattedAddress,
      name: data.displayName?.text || formattedAddress,
      displayName: data.displayName,
      address_components: addressComponents,
      addressComponents: data.addressComponents,
      location: data.location,
      geometry: {
        location: {
          lat: lat,
          lng: lng,
        },
      },
    });
  } catch (error: any) {
    console.error("Error in /api/places/details:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
