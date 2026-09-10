import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial CRM survey types, spokes, staff users, and clients...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  // 1. Seed Spokes (Regional Branches)
  const spokesData = [
    {
      name: "New York Regional Office",
      shortName: "NY",
      city: "Albany",
      state: "NY",
      lbNumber: "LB-NY-00412",
      dailyCapacity: 20,
    },
    {
      name: "North Carolina Regional Office",
      shortName: "NC",
      city: "Raleigh",
      state: "NC",
      lbNumber: "LB-NC-00893",
      dailyCapacity: 15,
    },
    {
      name: "Florida Regional Office",
      shortName: "FL",
      city: "Orlando",
      state: "FL",
      lbNumber: "LB-FL-00128",
      dailyCapacity: 25,
    },
  ];

  const createdSpokes: Record<string, any> = {};

  for (const s of spokesData) {
    const existing = await prisma.spoke.findFirst({
      where: { shortName: s.shortName },
    });
    if (existing) {
      createdSpokes[s.shortName] = await prisma.spoke.update({
        where: { id: existing.id },
        data: s,
      });
    } else {
      createdSpokes[s.shortName] = await prisma.spoke.create({
        data: s,
      });
    }
  }

  // 2. Seed Survey Types with Inclusions & Exclusions templates
  const surveyTypesData = [
    {
      name: "Boundary Survey",
      defaultPrice: 975.0,
      includedFeatures: [
        "Recover and verify boundary monument pins",
        "Field measurement of property lines and visible fence lines",
        "Detailed CAD drafting of property boundary plat",
        "Certified signed & sealed PDF survey document",
      ],
      excludedFeatures: [
        "Topographic elevation contours",
        "Subsurface utility detection & underground locating",
        "Tree diameter and canopy survey",
        "Municipal permit application fees",
      ],
    },
    {
      name: "Elevation Certificate",
      defaultPrice: 350.0,
      includedFeatures: [
        "FEMA standard elevation certificate form completion",
        "Benchmark elevation tie-in and datum verification",
        "Finished floor, lowest adjacent grade, and highest adjacent grade measurements",
        "Building photographs (front, rear, side elevations)",
      ],
      excludedFeatures: [
        "Boundary property line staking",
        "Title search and easement analysis",
      ],
    },
    {
      name: "SURVEY FOR PERMITS",
      defaultPrice: 1200.0,
      includedFeatures: [
        "Boundary location and property corner recovery",
        "Existing building footprints, driveways, and concrete flatwork",
        "Required local building setbacks and recorded easements display",
        "Seal and signature for city/county permit submission",
      ],
      excludedFeatures: [
        "Architectural floor plan drafting",
        "Environmental wetland delineation",
        "Structural engineering certification",
      ],
    },
  ];

  for (const st of surveyTypesData) {
    await prisma.surveyType.upsert({
      where: { name: st.name },
      update: {
        defaultPrice: st.defaultPrice,
        includedFeatures: st.includedFeatures,
        excludedFeatures: st.excludedFeatures,
      },
      create: {
        name: st.name,
        defaultPrice: st.defaultPrice,
        includedFeatures: st.includedFeatures,
        excludedFeatures: st.excludedFeatures,
      },
    });
  }

  // 3. Seed Users with Spoke assignments
  const usersData = [
    {
      email: "admin@landsurvey.com",
      name: "System Admin",
      role: Role.ADMIN,
      spokeId: createdSpokes["NY"]?.id || null,
    },
    {
      email: "csr@landsurvey.com",
      name: "Customer Specialist",
      role: Role.CSR,
      spokeId: createdSpokes["FL"]?.id || null,
    },
    {
      email: "drafter@landsurvey.com",
      name: "CAD Drafter",
      role: Role.DRAFTER,
      spokeId: createdSpokes["NC"]?.id || null,
    },
    {
      email: "field@landsurvey.com",
      name: "Field Party Chief",
      role: Role.FIELD_WORKER,
      spokeId: createdSpokes["FL"]?.id || null,
      address: "Lindenhurst, NY",
      latitude: 40.6862,
      longitude: -73.3736,
    },
    {
      email: "pls@landsurvey.com",
      name: "Professional Land Surveyor",
      role: Role.SIGNING_SURVEYOR,
      spokeId: createdSpokes["NY"]?.id || null,
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        spokeId: u.spokeId,
        isActive: true,
        password: hashedPassword,
        address: (u as any).address || null,
        latitude: (u as any).latitude || null,
        longitude: (u as any).longitude || null,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        spokeId: u.spokeId,
        isActive: true,
        password: hashedPassword,
        address: (u as any).address || null,
        latitude: (u as any).latitude || null,
        longitude: (u as any).longitude || null,
      },
    });
  }

  // 3b. Seed Protected Default System Admin from Environment (if configured)
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL?.toLowerCase().trim();
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const defaultAdminName = process.env.DEFAULT_ADMIN_NAME || "System Administrator";

  if (defaultAdminEmail && defaultAdminPassword) {
    const defaultHashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
    await prisma.user.upsert({
      where: { email: defaultAdminEmail },
      update: {
        name: defaultAdminName,
        role: Role.ADMIN,
        isActive: true,
        password: defaultHashedPassword,
      },
      create: {
        email: defaultAdminEmail,
        name: defaultAdminName,
        role: Role.ADMIN,
        isActive: true,
        password: defaultHashedPassword,
      },
    });
    console.log(`Protected system admin seeded: ${defaultAdminEmail}`);
  }

  // 4. Seed Sample Clients
  const clientsData = [
    {
      name: "Apex Commercial Builders LLC",
      email: "accounting@apexbuilders.com",
      phone: "(713) 555-0199",
      address: "1200 Texas Ave, Suite 400, Houston, TX 77002",
      clientType: "Commercial Builder",
      defaultInvoiceRules: "Net 30. Require PO# and Project Job Code on all invoices.",
      specialInstructions: "Always notify Site Superintendent 24h before field crew arrival. PPE mandatory on site.",
    },
    {
      name: "Lone Star Title & Escrow",
      email: "closing@lonestartitle.com",
      phone: "(512) 555-8822",
      address: "800 Congress Ave, Austin, TX 78701",
      clientType: "Title Company",
      defaultInvoiceRules: "Payment due at closing (POC). Include GF# on invoice and survey plat.",
      specialInstructions: "Deliver certified digital PDF survey plat with electronic seal at least 4 business days before closing.",
    },
    {
      name: "Summit Engineering Partners",
      email: "projects@summiteng.com",
      phone: "(214) 555-4321",
      address: "2200 Ross Ave, Dallas, TX 75201",
      clientType: "Engineering Firm",
      defaultInvoiceRules: "Net 15 terms. Monthly progress billing accepted.",
      specialInstructions: "Deliver both stamped PDF and Civil 3D 2024 DWG format with NAD83 coordinates.",
    },
  ];

  for (const c of clientsData) {
    const existing = await prisma.client.findFirst({
      where: { name: c.name },
    });
    if (!existing) {
      await prisma.client.create({
        data: c,
      });
    }
  }

  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
