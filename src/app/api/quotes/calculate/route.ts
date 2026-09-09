import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateQuotePrice } from "@/services/pricingEngine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const result = await calculateQuotePrice(body);

    return NextResponse.json({
      success: true,
      data: result,
      result,
    });
  } catch (error: any) {
    console.error("Pricing calculation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to calculate quote pricing" },
      { status: 500 }
    );
  }
}
