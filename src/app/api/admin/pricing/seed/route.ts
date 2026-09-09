import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEED_ZONES = [
  // North Carolina Zones
  {
    name: "Zone 1",
    state: "NC",
    description: "Inside 1 hour of Clayton, where most crews mobilize from",
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    bands: [
      { maxAcres: 1.0, price: 700.0 },
      { maxAcres: 2.0, price: 950.0 },
      { maxAcres: 3.0, price: 1350.0 },
    ],
  },
  {
    name: "Zone 2",
    state: "NC",
    description: "1 to 1.5 hours from Clayton",
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    bands: [
      { maxAcres: 1.0, price: 875.0 },
      { maxAcres: 2.0, price: 1125.0 },
      { maxAcres: 3.0, price: 1525.0 },
    ],
  },
  {
    name: "Zone 3",
    state: "NC",
    description: "1.5 to 2 hours from Clayton",
    quoteOnly: true,
    outOfArea: false,
    basePrice: 1200.0,
    bands: [],
  },
  {
    name: "Outside the area",
    state: "NC",
    description: "Beyond 2 hours from Clayton",
    quoteOnly: false,
    outOfArea: true,
    basePrice: null,
    bands: [],
  },

  // New York Zones
  {
    name: "Zone A",
    state: "NY",
    description: "Nassau, inland",
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    bands: [
      { maxAcres: 0.8, price: 750.0 },
      { maxAcres: 1.5, price: 1000.0 },
      { maxAcres: 2.0, price: 1700.0 },
      { maxAcres: 3.0, price: 3100.0 },
    ],
  },
  {
    name: "Zone B",
    state: "NY",
    description: "Suffolk inland west of the forks, Queens, Brooklyn",
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    bands: [
      { maxAcres: 0.8, price: 750.0 },
      { maxAcres: 1.5, price: 1000.0 },
      { maxAcres: 2.0, price: 1700.0 },
      { maxAcres: 3.0, price: 3100.0 },
    ],
  },
  {
    name: "Zone C",
    state: "NY",
    description: "Westchester north of Yonkers",
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    bands: [
      { maxAcres: 0.8, price: 1075.0 },
      { maxAcres: 1.5, price: 1550.0 },
      { maxAcres: 2.0, price: 2000.0 },
      { maxAcres: 3.0, price: 3525.0 },
    ],
  },
  {
    name: "Zone D",
    state: "NY",
    description: "Bronx, Staten Island, Yonkers and lower Westchester, Rockland, Putnam",
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    bands: [
      { maxAcres: 0.8, price: 1325.0 },
      { maxAcres: 1.5, price: 1875.0 },
      { maxAcres: 2.0, price: 2425.0 },
      { maxAcres: 3.0, price: 4175.0 },
    ],
  },
  {
    name: "Zone E",
    state: "NY",
    description: "East End — Southold hamlet east on the North Fork, Shinnecock Canal east on South Fork, Shelter Island, Fishers Island",
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    bands: [
      { maxAcres: 0.8, price: 1650.0 },
      { maxAcres: 1.5, price: 2300.0 },
      { maxAcres: 2.0, price: 3075.0 },
      { maxAcres: 3.0, price: 4175.0 },
    ],
  },
  {
    name: "Quote only",
    state: "NY",
    description: "Individually quoted areas",
    quoteOnly: true,
    outOfArea: false,
    basePrice: null,
    bands: [],
  },
  {
    name: "Outside the area",
    state: "NY",
    description: "Manhattan, and anything north of Putnam County",
    quoteOnly: false,
    outOfArea: true,
    basePrice: null,
    bands: [],
  },
];

const SEED_ADDONS = [
  // NC Addons
  {
    state: "NC",
    key: "extra_stake_nc",
    label: "Extra Corner Stake (over 4)",
    price: 75.0,
    isPerUnit: true,
  },
  {
    state: "NC",
    key: "monument_nc",
    label: "Concrete Boundary Monument",
    price: 100.0,
    isPerUnit: true,
  },
  {
    state: "NC",
    key: "stakeout_z1",
    label: "Zone 1 Stakeout Only",
    price: 450.0,
    isPerUnit: false,
  },
  {
    state: "NC",
    key: "stakeout_z2",
    label: "Zone 2 Stakeout Only",
    price: 600.0,
    isPerUnit: false,
  },
  {
    state: "NC",
    key: "ec_z1",
    label: "Zone 1 Elevation Certificate",
    price: 650.0,
    isPerUnit: false,
  },
  {
    state: "NC",
    key: "ec_z2",
    label: "Zone 2 Elevation Certificate",
    price: 825.0,
    isPerUnit: false,
  },

  // NY Addons
  {
    state: "NY",
    key: "corners_zone_a",
    label: "Zone A Property Corner Staking (First 4)",
    price: 325.0,
    isPerUnit: false,
  },
  {
    state: "NY",
    key: "corners_zone_b",
    label: "Zone B Property Corner Staking (First 4)",
    price: 325.0,
    isPerUnit: false,
  },
  {
    state: "NY",
    key: "corners_zone_c",
    label: "Zone C Property Corner Staking (First 4)",
    price: 575.0,
    isPerUnit: false,
  },
  {
    state: "NY",
    key: "corners_zone_d",
    label: "Zone D Property Corner Staking (First 4)",
    price: 650.0,
    isPerUnit: false,
  },
  {
    state: "NY",
    key: "corners_zone_e",
    label: "Zone E Property Corner Staking (First 4)",
    price: 775.0,
    isPerUnit: false,
  },
  {
    state: "NY",
    key: "extra_stake_ny",
    label: "Extra Corner Stake (over 4)",
    price: 125.0,
    isPerUnit: true,
  },
  {
    state: "NY",
    key: "pol_stake_ny",
    label: "Point on Line (POL) Stake",
    price: 75.0,
    isPerUnit: true,
  },
  {
    state: "NY",
    key: "monument_ny",
    label: "Concrete Boundary Monument",
    price: 100.0,
    isPerUnit: true,
  },
  {
    state: "NY",
    key: "water_taxi_ny",
    label: "Fire Island Water Taxi Fee",
    price: 500.0,
    isPerUnit: false,
  },
];

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Seed Pricing Zones & Bands
    for (const z of SEED_ZONES) {
      const existing = await prisma.pricingZone.findFirst({
        where: { name: z.name, state: z.state },
      });

      let zoneId = existing?.id;
      if (existing) {
        await prisma.pricingZone.update({
          where: { id: existing.id },
          data: {
            description: z.description,
            quoteOnly: z.quoteOnly,
            outOfArea: z.outOfArea,
            basePrice: z.basePrice,
          },
        });
        // Delete old bands and recreate
        await prisma.pricingBand.deleteMany({ where: { zoneId: existing.id } });
      } else {
        const created = await prisma.pricingZone.create({
          data: {
            name: z.name,
            state: z.state,
            description: z.description,
            quoteOnly: z.quoteOnly,
            outOfArea: z.outOfArea,
            basePrice: z.basePrice,
          },
        });
        zoneId = created.id;
      }

      if (zoneId && z.bands.length > 0) {
        for (const band of z.bands) {
          await prisma.pricingBand.create({
            data: {
              zoneId,
              maxAcres: band.maxAcres,
              price: band.price,
            },
          });
        }
      }
    }

    // Seed Pricing Addons
    for (const addon of SEED_ADDONS) {
      await prisma.pricingAddon.upsert({
        where: { key: addon.key },
        update: {
          state: addon.state,
          label: addon.label,
          price: addon.price,
          isPerUnit: addon.isPerUnit,
        },
        create: {
          state: addon.state,
          key: addon.key,
          label: addon.label,
          price: addon.price,
          isPerUnit: addon.isPerUnit,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Successfully seeded pricing zones, acreage bands, and add-ons from BOOK catalog.",
    });
  } catch (error: any) {
    console.error("Failed to seed pricing tables:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to seed pricing tables" },
      { status: 500 }
    );
  }
}
