import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json(
        { error: "Forbidden: Initial setup has already been completed." },
        { status: 403 }
      );
    }

    // 1. Create or ensure the 3 default Spokes (NY, NC, FL) with dailyCapacity = 15
    const spokesData = [
      {
        name: "New York Regional Office",
        shortName: "NY",
        city: "Albany",
        state: "NY",
        lbNumber: "LB-NY-00412",
        dailyCapacity: 15,
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
        dailyCapacity: 15,
      },
    ];

    const createdSpokes: Record<string, any> = {};
    for (const s of spokesData) {
      const existing = await prisma.spoke.findFirst({
        where: { shortName: s.shortName },
      });
      if (existing) {
        createdSpokes[s.shortName] = existing;
      } else {
        createdSpokes[s.shortName] = await prisma.spoke.create({
          data: s,
        });
      }
    }

    // 2. Ensure baseline Survey Types exist
    const defaultSurveyTypes = [
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

    for (const st of defaultSurveyTypes) {
      await prisma.surveyType.upsert({
        where: { name: st.name },
        update: {},
        create: st,
      });
    }

    // 3. Create ADMIN user with secure credentials
    const defaultPassword = "SecurePass2026!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const adminEmail = "erik@mjslandsurvey.com";

    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Erik (Admin)",
        role: Role.ADMIN,
        password: hashedPassword,
        isActive: true,
        spokeId: createdSpokes["NY"]?.id || null,
        address: "Albany, NY",
      },
      include: {
        spoke: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully.",
      credentials: {
        email: adminEmail,
        password: defaultPassword,
        role: adminUser.role,
        spoke: adminUser.spoke?.name || "New York Regional Office",
      },
      spokesCreated: Object.keys(createdSpokes).length,
    });
  } catch (error: any) {
    console.error("Initialization error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initialize database" },
      { status: 500 }
    );
  }
}
