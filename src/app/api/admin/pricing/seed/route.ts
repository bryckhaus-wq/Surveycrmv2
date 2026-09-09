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
    color: "#10b981", // Emerald
    priority: 30,
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-77.73168, 35.58502],
          [-77.86653, 35.97474],
          [-78.29224, 36.10696],
          [-78.45059, 36.10185],
          [-78.54622, 36.09069],
          [-78.82621, 36.14685],
          [-79.01065, 36.03887],
          [-79.06093, 35.94842],
          [-79.23825, 35.80403],
          [-79.24312, 35.76102],
          [-79.2369, 35.67082],
          [-79.28364, 35.55962],
          [-79.18329, 35.47866],
          [-79.14387, 35.44454],
          [-78.99933, 35.2941],
          [-78.98067, 35.11254],
          [-78.92265, 35.07064],
          [-78.78905, 35.04543],
          [-78.66592, 35.12835],
          [-78.38793, 35.18923],
          [-78.23872, 35.21198],
          [-78.06693, 35.24469],
          [-78.06247, 35.24589],
          [-78.058, 35.24586],
          [-77.93254, 35.33265],
          [-77.86868, 35.41849],
          [-77.85887, 35.43542],
          [-77.73168, 35.58502],
        ],
      ],
    },
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
    color: "#f59e0b", // Amber
    priority: 20,
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-77.66689, 35.00044],
          [-77.6897, 35.00946],
          [-77.50608, 35.22474],
          [-77.40261, 35.41953],
          [-77.29856, 35.69006],
          [-77.24967, 35.85236],
          [-77.30905, 36.13242],
          [-77.48683, 36.30661],
          [-77.56401, 36.45158],
          [-77.74424, 36.50866],
          [-78.03724, 36.52387],
          [-78.25754, 36.52203],
          [-78.26575, 36.52204],
          [-78.3355, 36.5221],
          [-78.54474, 36.52768],
          [-78.83347, 36.52852],
          [-78.9798, 36.50503],
          [-79.17786, 36.34223],
          [-79.43483, 36.13605],
          [-79.46814, 36.0797],
          [-79.51306, 35.98035],
          [-79.56577, 35.85784],
          [-79.64577, 35.73835],
          [-79.76494, 35.76359],
          [-79.83455, 35.75626],
          [-79.83716, 35.74962],
          [-79.84115, 35.74297],
          [-79.88371, 35.67532],
          [-79.83336, 35.60873],
          [-79.79579, 35.47593],
          [-79.79157, 35.46718],
          [-79.78599, 35.45843],
          [-79.77901, 35.4464],
          [-79.75569, 35.22853],
          [-79.74622, 35.11614],
          [-79.51369, 34.92277],
          [-79.50844, 34.92111],
          [-79.18005, 34.8178],
          [-78.95618, 34.78228],
          [-78.81869, 34.71607],
          [-78.47266, 34.7036],
          [-78.47162, 34.7036],
          [-78.44459, 34.70957],
          [-77.9726, 34.72407],
          [-77.66689, 35.00044],
        ],
      ],
    },
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
    color: "#6366f1", // Indigo
    priority: 10,
    quoteOnly: true,
    outOfArea: false,
    basePrice: 1200.0,
    geometry: null,
    bands: [],
  },
  {
    name: "Outside the area",
    state: "NC",
    description: "Beyond 2 hours from Clayton",
    color: "#ef4444", // Rose/Red
    priority: 0,
    quoteOnly: false,
    outOfArea: true,
    basePrice: null,
    geometry: null,
    bands: [],
  },

  // New York Zones
  {
    name: "Zone A",
    state: "NY",
    description: "Nassau, inland",
    color: "#3b82f6", // Blue
    priority: 25,
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-73.76, 40.58],
          [-73.74, 40.89],
          [-73.45, 40.89],
          [-73.44, 40.58],
          [-73.76, 40.58],
        ],
      ],
    },
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
    color: "#06b6d4", // Cyan
    priority: 20,
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-73.45, 40.62],
          [-73.45, 40.93],
          [-72.503, 40.93],
          [-72.503, 40.7],
          [-73.45, 40.62],
        ],
      ],
    },
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
    color: "#8b5cf6", // Violet
    priority: 20,
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-73.92, 40.95],
          [-73.92, 41.35],
          [-73.55, 41.35],
          [-73.65, 40.95],
          [-73.92, 40.95],
        ],
      ],
    },
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
    color: "#ec4899", // Pink
    priority: 20,
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-74.26, 40.48],
          [-74.26, 41.52],
          [-73.75, 41.52],
          [-73.75, 40.48],
          [-74.26, 40.48],
        ],
      ],
    },
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
    description: "East End — Southold hamlet east on North Fork, Shinnecock Canal east on South Fork, Shelter Island, Fishers Island",
    color: "#a855f7", // Purple
    priority: 30, // Higher priority over Zone B in overlapping coastal bounds
    quoteOnly: false,
    outOfArea: false,
    basePrice: null,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-72.445, 41.4],
          [-72.445, 41.0],
          [-72.503, 40.93],
          [-72.503, 40.7],
          [-71.6, 40.7],
          [-71.6, 41.4],
          [-72.445, 41.4],
        ],
      ],
    },
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
    color: "#eab308", // Yellow
    priority: 10,
    quoteOnly: true,
    outOfArea: false,
    basePrice: null,
    geometry: null,
    bands: [],
  },
  {
    name: "Outside the area",
    state: "NY",
    description: "Manhattan, and anything north of Putnam County",
    color: "#ef4444", // Red
    priority: 0,
    quoteOnly: false,
    outOfArea: true,
    basePrice: null,
    geometry: null,
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
      const existing: any = await prisma.pricingZone.findFirst({
        where: { name: z.name, state: z.state },
      });

      let zoneId = existing?.id;
      if (existing) {
        await prisma.pricingZone.update({
          where: { id: existing.id },
          data: {
            description: z.description,
            color: z.color,
            priority: z.priority,
            quoteOnly: z.quoteOnly,
            outOfArea: z.outOfArea,
            basePrice: z.basePrice,
            geometry: z.geometry as any,
          },
        });
        // Delete old bands and recreate
        await prisma.pricingBand.deleteMany({ where: { zoneId: existing.id } });
      } else {
        const created: any = await prisma.pricingZone.create({
          data: {
            name: z.name,
            state: z.state,
            description: z.description,
            color: z.color,
            priority: z.priority,
            quoteOnly: z.quoteOnly,
            outOfArea: z.outOfArea,
            basePrice: z.basePrice,
            geometry: z.geometry as any,
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
