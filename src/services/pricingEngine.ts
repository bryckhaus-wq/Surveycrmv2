import { prisma } from "@/lib/prisma";

export interface PricingCalculationInput {
  state?: string | null;
  county?: string | null;
  city?: string | null;
  zip?: string | null;
  acres?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  productType?: string | null;
  complicatingFactors?: Record<string, boolean> | null;
  corners?: boolean;
  numberOfCorners?: number;
  numberOfMonuments?: number;
  numberOfPolStakes?: number;
  isFireIsland?: boolean;
  channel?: string | null;
  zoneId?: string | null;
  quoteId?: string | null;
}

export interface PricingCalculationResult {
  mode: "price" | "route" | "decline";
  total?: number;
  basePrice?: number;
  basis?: string;
  timeframe?: string;
  breakdown?: Array<{
    item: string;
    amount: number;
    description?: string;
  }>;
  zone?: {
    id: string;
    name: string;
    state: string;
    description?: string | null;
  } | null;
  requiresReview?: boolean;
  reason?: string;
  detail?: string;
  sayScript?: string;
  assignedManager?: string;
  assignedRole?: string;
}

/**
 * Normalizes user/system product type string to pricing category
 */
export function normalizeProductType(productName?: string | null): string {
  const p = (productName || "").trim().toLowerCase();
  if (p.includes("alta") || p.includes("nsps")) return "alta";
  if (p.includes("subdivision")) return "subdivision";
  if (p.includes("permit")) return "permit";
  if (p.includes("elevation") || p.includes("fema") || p.includes("ec")) return "ec";
  if (p.includes("stakeout") || p.includes("stake")) return "stakeout";
  if (p.includes("topo") || p.includes("contour")) return "topo";
  if (p.includes("architectural") || p.includes("engineering")) return "arch";
  if (p.includes("update") || p.includes("recert")) return "update";
  if (p.includes("final")) return "final";
  if (p.includes("plot")) return "plot";
  return "boundary";
}

/**
 * Resolves regional project manager contact for routed quotes
 */
function getManagerInfo(state: string) {
  if (state === "NC") {
    return {
      assignedManager: "Project Manager (NC Division)",
      assignedRole: "North Carolina Project Manager",
    };
  }
  return {
    assignedManager: "Project Manager (NY Division)",
    assignedRole: "New York Project Manager",
  };
}

/**
 * Dynamic Pricing Engine
 * Queries Prisma Pricing tables dynamically to calculate prices, add-ons, or routing flags.
 */
export async function calculateQuotePrice(
  input: PricingCalculationInput
): Promise<PricingCalculationResult> {
  let state = (input.state || "").trim().toUpperCase();
  let county = input.county || "";
  let acres = input.acres !== undefined && input.acres !== null ? parseFloat(String(input.acres)) : null;
  let complicatingFactors = input.complicatingFactors || {};
  let productType = normalizeProductType(input.productType);
  let lat = input.latitude ?? null;
  let lon = input.longitude ?? null;

  if (input.quoteId) {
    const dbQuote: any = await prisma.quote.findUnique({
      where: { id: input.quoteId },
      include: { surveyType: true },
    });
    if (dbQuote) {
      state = state || (dbQuote.state ? dbQuote.state.toUpperCase() : "NY");
      county = county || dbQuote.county || "";
      if (acres === null) {
        acres = dbQuote.deedAcres ?? dbQuote.acres ?? null;
      }
      if (Object.keys(complicatingFactors).length === 0 && dbQuote.complicatingFactors) {
        complicatingFactors = dbQuote.complicatingFactors as Record<string, boolean>;
      }
      if (!input.productType && dbQuote.surveyType) {
        productType = normalizeProductType(dbQuote.surveyType.name);
      }
      if (lat === null) lat = dbQuote.latitude;
      if (lon === null) lon = dbQuote.longitude;
    }
  }

  if (!state) {
    state = "NY";
  }

  const { assignedManager, assignedRole } = getManagerInfo(state);

  const routeResult = (reason: string, detail: string): PricingCalculationResult => ({
    mode: "route",
    requiresReview: true,
    reason,
    detail,
    assignedManager,
    assignedRole,
  });

  const declineResult = (reason: string, detail: string, sayScript: string): PricingCalculationResult => ({
    mode: "decline",
    requiresReview: true,
    reason,
    detail,
    sayScript,
  });

  // 1. Check territory-specific geographic product restrictions
  if (state === "NC" && productType === "subdivision") {
    return declineResult(
      "Subdivision Work Not Offered in NC",
      "Subdivision work is not offered from our Raleigh regional branch.",
      "We do not handle subdivision work out of our Raleigh office. We focus on title, boundary and residential survey work there."
    );
  }

  if (state === "NC" && productType === "permit") {
    return declineResult(
      "Permit Surveys Not Quoted in NC",
      "The Raleigh branch does not quote municipal permit surveys.",
      "We do not quote permit surveys in North Carolina, but we are happy to assist with title and boundary work."
    );
  }

  // 2. Check manual routing products
  if (state === "NY" && productType === "subdivision") {
    return routeResult(
      "Subdivision — Scope Review",
      "Subdivision scope must be evaluated and priced individually by a project manager."
    );
  }

  if (productType === "topo" || productType === "arch" || productType === "update") {
    return routeResult(
      "Custom Scope Product",
      "Topographic, architectural, and previous file updates require project manager estimation."
    );
  }

  // 3. Evaluate Complicating Factors
  const factors = complicatingFactors || {};
  if (factors["Metes and bounds"]) {
    return routeResult(
      "Metes and Bounds Description",
      "Unplatted metes & bounds parcels take materially longer to research and run."
    );
  }
  if (factors["No road access"]) {
    return routeResult(
      "Access Restricted / No Road Access",
      "No direct road frontage or gate access requires specific crew planning."
    );
  }
  if (factors["Multiple lots"]) {
    return routeResult(
      "Multiple Lots / Parcels",
      "The property spans multiple lots and requires parcel boundary review."
    );
  }
  if (factors["Boundary dispute"]) {
    return routeResult(
      "Known Boundary Dispute",
      "Active property line dispute alters liability and evidence analysis."
    );
  }
  if (factors["Incomplete deed"]) {
    return routeResult(
      "Incomplete Deed Record",
      "Senior rights and deed reconstruction required prior to field deployment."
    );
  }
  if (factors["Water frontage"]) {
    return routeResult(
      "Water Frontage Property",
      "Waterfront parcels with riparian rights or bulkhead lines are quoted individually."
    );
  }
  if (factors["Steep terrain"]) {
    return routeResult(
      "Steep Terrain / Obstacles",
      "Significant elevation changes require additional instrument setups."
    );
  }
  if (factors["Multiple structures"]) {
    return routeResult(
      "Multiple Structures",
      "Extensive improvements require additional locating and drafting time."
    );
  }
  if (factors["Retaining walls"]) {
    return routeResult(
      "Retaining Walls",
      "Structural boundary retaining walls require specific top/bottom location."
    );
  }
  if (factors["Irregular shape"]) {
    return routeResult(
      "Irregular Boundary Shape",
      "Numerous non-orthogonal boundary courses require custom computations."
    );
  }
  if (factors["Commercial/ALTA"]) {
    return routeResult(
      "Commercial / ALTA Property Review",
      "Commercial / ALTA surveys require custom scope review by a project manager."
    );
  }
  if (factors["Heavily wooded"] && acres !== null && acres > 1.0) {
    return routeResult(
      "Heavily Wooded (> 1 Acre)",
      "Dense vegetation on larger parcels significantly impacts traverse clearing."
    );
  }

  // 4. Validate acreage
  if (acres === null || isNaN(acres) || acres <= 0) {
    return routeResult(
      "Acreage Required",
      "Enter the parcel acreage to calculate published pricing."
    );
  }

  // 5. Determine Pricing Zone from DB
  let matchedZone: any = null;

  if (input.zoneId) {
    matchedZone = await (prisma as any).pricingZone.findUnique({
      where: { id: input.zoneId },
      include: { bands: { orderBy: { maxAcres: "asc" } } },
    });
  }

  if (!matchedZone) {
    const normCounty = (county || "").trim().toLowerCase();
    const zones: any[] = await (prisma as any).pricingZone.findMany({
      where: { state },
      include: { bands: { orderBy: { maxAcres: "asc" } } },
      orderBy: { name: "asc" },
    });

    if (state === "NY") {
      if (normCounty.includes("nassau")) {
        matchedZone = zones.find((z: any) => z.name.includes("Zone A"));
      } else if (normCounty.includes("suffolk")) {
        if (normCounty.includes("east") || (lon !== null && lon > -72.5)) {
          matchedZone = zones.find((z: any) => z.name.includes("Zone E"));
        } else {
          matchedZone = zones.find((z: any) => z.name.includes("Zone B"));
        }
      } else if (normCounty.includes("westchester")) {
        matchedZone = zones.find((z: any) => z.name.includes("Zone C"));
      } else if (
        normCounty.includes("bronx") ||
        normCounty.includes("staten") ||
        normCounty.includes("rockland") ||
        normCounty.includes("putnam")
      ) {
        matchedZone = zones.find((z: any) => z.name.includes("Zone D"));
      } else if (normCounty.includes("manhattan") || normCounty.includes("new york")) {
        matchedZone = zones.find((z: any) => z.outOfArea);
      }
    } else if (state === "NC") {
      matchedZone = zones.find((z: any) => z.name.includes("Zone 1")) || zones[0];
    }

    if (!matchedZone && zones.length > 0) {
      matchedZone = zones[0];
    }
  }

  if (!matchedZone) {
    return routeResult(
      "No Pricing Zone Configured",
      `No active pricing zone exists for state ${state}. Please configure zones in Admin Pricing Dashboard.`
    );
  }

  if (matchedZone.outOfArea) {
    return declineResult(
      "Out of Service Area",
      "This parcel is located beyond our standard regional operating radius.",
      "That property is outside the area we cover, so we are not able to service it."
    );
  }

  if (matchedZone.quoteOnly) {
    return routeResult(
      `${matchedZone.name} — Quote Only`,
      `Parcels in ${matchedZone.name} require individual quote determination by the project manager.`
    );
  }

  // 6. Calculate Base Price from Acreage Bands
  let basePrice = 0;
  let basis = "";

  if (productType === "ec") {
    const ecAddon = await (prisma as any).pricingAddon.findFirst({
      where: { state, key: { contains: "ec" } },
    });
    basePrice = ecAddon?.price || (state === "NC" ? 650 : 750);
    basis = "Elevation Certificate Flat Rate";
  } else if (productType === "stakeout") {
    const stakeoutAddon = await (prisma as any).pricingAddon.findFirst({
      where: { state, key: { contains: "stakeout" } },
    });
    basePrice = stakeoutAddon?.price || (state === "NC" ? 450 : 600);
    basis = "Stakeout Only";
  } else {
    const maxConfiguredAcres = matchedZone.bands.length > 0
      ? Math.max(...matchedZone.bands.map((b: any) => b.maxAcres))
      : 0;

    const band = matchedZone.bands.find((b: any) => acres! <= b.maxAcres + 0.0001);
    if (!band) {
      return routeResult(
        "Property Acreage Too Large",
        `The parcel size (${acres} acres) is too big for the configured pricing tiers (max ${maxConfiguredAcres} acres) in ${matchedZone.name}. Quoted individually by project manager.`
      );
    }
    basePrice = band.price;
    basis = `${matchedZone.name} (up to ${band.maxAcres} acres)`;
  }

  // 7. Calculate Add-ons
  const breakdown: Array<{ item: string; amount: number; description?: string }> = [
    {
      item: `Base Survey Price (${basis})`,
      amount: basePrice,
      description: matchedZone.description || `${state} ${matchedZone.name}`,
    },
  ];

  let totalAddons = 0;
  const addons: any[] = await (prisma as any).pricingAddon.findMany({ where: { state } });

  const isStaking = state === "NC" || Boolean(input.corners);
  if (isStaking) {
    if (state === "NY") {
      const zoneLetter = matchedZone.name.replace(/[^A-Za-z]/g, "").toLowerCase();
      const cornerKey = `corners_zone_${zoneLetter}`;
      const cornerAddon = addons.find((a: any) => a.key === cornerKey);
      if (cornerAddon) {
        breakdown.push({
          item: cornerAddon.label,
          amount: cornerAddon.price,
          description: "Includes initial 4 property boundary corner pins",
        });
        totalAddons += cornerAddon.price;
      }
    }

    const nCorners = Math.max(4, parseInt(String(input.numberOfCorners || 4), 10));
    if (nCorners > 4) {
      const extraCount = nCorners - 4;
      const extraAddon = addons.find((a: any) => a.key.startsWith("extra_stake"));
      const rate = extraAddon?.price || (state === "NY" ? 125 : 75);
      const cost = extraCount * rate;
      breakdown.push({
        item: `Extra Corner Stakes (${extraCount} @ $${rate})`,
        amount: cost,
        description: `Additional corners beyond baseline 4`,
      });
      totalAddons += cost;
    }

    if (input.numberOfMonuments && input.numberOfMonuments > 0) {
      const monAddon = addons.find((a: any) => a.key.startsWith("monument"));
      const rate = monAddon?.price || 100;
      const cost = input.numberOfMonuments * rate;
      breakdown.push({
        item: `Concrete Monuments (${input.numberOfMonuments} @ $${rate})`,
        amount: cost,
      });
      totalAddons += cost;
    }

    if (state === "NY" && input.numberOfPolStakes && input.numberOfPolStakes > 0) {
      const polAddon = addons.find((a: any) => a.key === "pol_stake_ny");
      const rate = polAddon?.price || 75;
      const cost = input.numberOfPolStakes * rate;
      breakdown.push({
        item: `Point on Line (POL) Stakes (${input.numberOfPolStakes} @ $${rate})`,
        amount: cost,
      });
      totalAddons += cost;
    }
  }

  if (state === "NY" && input.isFireIsland) {
    const taxiAddon = addons.find((a: any) => a.key === "water_taxi_ny");
    const rate = taxiAddon?.price || 500;
    breakdown.push({
      item: "Fire Island Water Taxi & Logistics Fee",
      amount: rate,
      description: "Roundtrip boat transit to barrier island",
    });
    totalAddons += rate;
  }

  const grandTotal = Math.round((basePrice + totalAddons) * 100) / 100;
  const timeframe = state === "NC" ? "10 to 14 business days" : "12 to 16 business days";

  return {
    mode: "price",
    requiresReview: false,
    basePrice,
    total: grandTotal,
    basis,
    timeframe,
    breakdown,
    zone: {
      id: matchedZone.id,
      name: matchedZone.name,
      state: matchedZone.state,
      description: matchedZone.description,
    },
  };
}
