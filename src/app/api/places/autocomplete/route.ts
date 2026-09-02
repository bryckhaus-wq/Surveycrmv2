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
    const input = searchParams.get("input") || searchParams.get("query") || "";

    if (!input.trim() || input.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey.includes("Placeholder")) {
      return NextResponse.json(
        { error: "Google Maps API Key not configured on server", suggestions: [] },
        { status: 503 }
      );
    }

    const referer = req.headers.get("referer") || undefined;

    // Google Places API (New) Autocomplete endpoint
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        ...(referer ? { Referer: referer } : {}),
      },
      body: JSON.stringify({
        input: input.trim(),
        includedRegionCodes: ["us"],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Places API autocomplete returned status:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to fetch autocomplete suggestions", details: errText, suggestions: [] },
        { status: res.status }
      );
    }

    const data = await res.json();
    const suggestions = (data.suggestions || []).map((item: any) => {
      const pred = item.placePrediction || {};
      const placeId = pred.placeId || (pred.place ? pred.place.replace("places/", "") : "");
      const fullText = pred.text?.text || "";
      const mainText =
        pred.structuredFormat?.mainText?.text ||
        fullText.split(",")[0] ||
        fullText;
      const secondaryText =
        pred.structuredFormat?.secondaryText?.text ||
        fullText.split(",").slice(1).join(",").trim() ||
        "";

      return {
        placeId,
        text: fullText,
        mainText,
        secondaryText,
      };
    });

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error("Error in /api/places/autocomplete:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error", suggestions: [] },
      { status: 500 }
    );
  }
}
