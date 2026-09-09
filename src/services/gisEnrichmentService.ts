import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "@/lib/s3";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  matchedAddress?: string;
  state?: string;
  county?: string;
  postal?: string;
}

export interface ParcelInfo {
  parcelId: string | null;
  taxParcelId?: string | null;
  deedAcres: number | null;
  acres?: number | null;
  primaryOwner: string | null;
  propertyClass: string | null;
  county?: string | null;
  rawAttributes?: Record<string, any>;
}

export interface EnrichmentData {
  latitude: number | null;
  longitude: number | null;
  parcelId: string | null;
  taxParcelId: string | null;
  deedAcres: number | null;
  acres: number | null;
  primaryOwner: string | null;
  propertyClass: string | null;
  satelliteImagePath: string | null;
  county?: string | null;
  state?: string | null;
  documentId?: string | null;
  [key: string]: any;
}

const PAD = 0.0007; // ~250 ft bounding box padding

/**
 * Calculates acreage from EPSG:4326 polygon rings using Shoelace area with geodesic lat/lon scaling
 */
function calculateAcreageFromRings(rings: number[][][], centerLat: number): number | null {
  if (!rings || rings.length === 0) return null;

  try {
    let totalSquareMeters = 0;
    const latRad = (centerLat * Math.PI) / 180;
    // Meters per degree
    const metersPerLat = 111132.954 - 559.822 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
    const metersPerLon = 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad);

    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r];
      if (ring.length < 3) continue;

      let ringArea = 0;
      for (let i = 0; i < ring.length; i++) {
        const j = (i + 1) % ring.length;
        const x1 = ring[i][0] * metersPerLon;
        const y1 = ring[i][1] * metersPerLat;
        const x2 = ring[j][0] * metersPerLon;
        const y2 = ring[j][1] * metersPerLat;
        ringArea += x1 * y2 - x2 * y1;
      }
      const area = Math.abs(ringArea) / 2;
      // Outer ring adds, inner rings (holes) subtract
      if (r === 0) {
        totalSquareMeters += area;
      } else {
        totalSquareMeters -= area;
      }
    }

    if (totalSquareMeters <= 0) return null;
    const acres = totalSquareMeters / 4046.8564224;
    return Math.round(acres * 1000) / 1000;
  } catch (err) {
    console.error("Failed to calculate polygon acreage:", err);
    return null;
  }
}

/**
 * Step 1: Geocode address using ArcGIS World Geocoding with US Census fallback
 */
export async function geocodeAddress(addressStr: string): Promise<GeocodeResult | null> {
  const cleanAddress = addressStr.trim();
  if (!cleanAddress) return null;

  // 1. Primary: Esri World Geocoding
  try {
    const esriUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(
      cleanAddress
    )}&outFields=Match_addr,Postal,Region,Subregion&maxLocations=1`;

    const res = await fetch(esriUrl, { method: "GET", headers: { Accept: "application/json" } });
    if (res.ok) {
      const data = await res.json();
      if (data.candidates && data.candidates.length > 0) {
        const best = data.candidates[0];
        if (best.location && typeof best.location.x === "number" && typeof best.location.y === "number") {
          return {
            latitude: best.location.y,
            longitude: best.location.x,
            matchedAddress: best.attributes?.Match_addr || best.address,
            state: best.attributes?.Region,
            county: best.attributes?.Subregion,
            postal: best.attributes?.Postal,
          };
        }
      }
    }
  } catch (err) {
    console.warn("ArcGIS geocoding failed, attempting Census fallback:", err);
  }

  // 2. Fallback: US Census Geocoder
  try {
    const censusUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(
      cleanAddress
    )}&benchmark=Public_AR_Current&format=json`;

    const res = await fetch(censusUrl, { method: "GET", headers: { Accept: "application/json" } });
    if (res.ok) {
      const data = await res.json();
      const matches = data.result?.addressMatches;
      if (matches && matches.length > 0) {
        const best = matches[0];
        const coords = best.coordinates;
        const comps = best.addressComponents || {};
        if (coords && typeof coords.x === "number" && typeof coords.y === "number") {
          return {
            latitude: coords.y,
            longitude: coords.x,
            matchedAddress: best.matchedAddress,
            state: comps.state,
            county: comps.county,
            postal: comps.zip,
          };
        }
      }
    }
  } catch (err) {
    console.error("US Census geocoding fallback failed:", err);
  }

  return null;
}

/**
 * Step 2: Query Public ArcGIS Parcel REST APIs
 */
export async function queryParcelData(
  lat: number,
  lon: number,
  stateHint?: string | null,
  countyHint?: string | null
): Promise<ParcelInfo | null> {
  const bbox = `${lon - PAD},${lat - PAD},${lon + PAD},${lat + PAD}`;
  const normState = (stateHint || "").trim().toUpperCase();
  const normCounty = (countyHint || "").trim().toLowerCase();

  const runEsriQuery = async (
    serviceUrl: string,
    outFields: string = "*"
  ): Promise<any> => {
    const url = `${serviceUrl}?geometry=${encodeURIComponent(
      bbox
    )}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=${encodeURIComponent(
      outFields
    )}&returnGeometry=true&f=json`;

    const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return response.json();
  };

  const isNC = normState === "NC" || normState === "NORTH CAROLINA";
  const isNY = normState === "NY" || normState === "NEW YORK";
  const isNassau = isNY && normCounty.includes("nassau");

  // 1. If NY / Nassau County
  if (isNassau || normCounty.includes("nassau")) {
    try {
      const nassauData = await runEsriQuery(
        "https://legacygis.nassaucountyny.gov/arcgis/rest/services/Akanda/MapServer/2/query",
        "*"
      );
      if (nassauData?.features && nassauData.features.length > 0) {
        const feat = nassauData.features[0];
        const attrs = feat.attributes || {};
        let acres = attrs.ACRES || attrs.GISACRES || attrs.CALC_ACRES || null;
        if (acres === null && feat.geometry?.rings) {
          acres = calculateAcreageFromRings(feat.geometry.rings, lat);
        }
        const parsedAcres = acres ? parseFloat(String(acres)) : null;
        const parcelId = attrs.SBL_KEY || attrs.SBL || attrs.PRINT_KEY || attrs.PARCEL_ID || null;
        return {
          parcelId,
          taxParcelId: parcelId,
          deedAcres: parsedAcres,
          acres: parsedAcres,
          primaryOwner: attrs.OWNER_NAME || attrs.OWNER || attrs.PRIMARY_OWNER || null,
          propertyClass: attrs.PROP_CLASS || attrs.CLASS || null,
          county: "Nassau",
          rawAttributes: attrs,
        };
      }
    } catch (err) {
      console.warn("Nassau County parcel query error:", err);
    }
  }

  // 2. If NY (NYS Tax Parcels Public)
  if (isNY || (!isNC && !normState)) {
    try {
      const nysData = await runEsriQuery(
        "https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Tax_Parcels_Public/MapServer/1/query",
        "PARCEL_ADDR,ACRES,CALC_ACRES,SQ_FT,PROP_CLASS,PRIMARY_OWNER,PRINT_KEY,SWIS_SBL_ID,SBL,COUNTY_NAME"
      );
      if (nysData?.features && nysData.features.length > 0) {
        const feat = nysData.features[0];
        const attrs = feat.attributes || {};
        const acresVal =
          attrs.ACRES ??
          attrs.CALC_ACRES ??
          (attrs.SQ_FT ? attrs.SQ_FT / 43560 : null);
        let finalAcres = acresVal ? parseFloat(String(acresVal)) : null;
        if (finalAcres === null && feat.geometry?.rings) {
          finalAcres = calculateAcreageFromRings(feat.geometry.rings, lat);
        }
        const formattedAcres = finalAcres ? Math.round(finalAcres * 1000) / 1000 : null;
        const parcelId =
          attrs.PRINT_KEY ||
          attrs.SWIS_SBL_ID ||
          attrs.SBL ||
          attrs.PARCEL_ADDR ||
          null;

        return {
          parcelId,
          taxParcelId: parcelId,
          deedAcres: formattedAcres,
          acres: formattedAcres,
          primaryOwner: attrs.PRIMARY_OWNER || null,
          propertyClass: attrs.PROP_CLASS ? String(attrs.PROP_CLASS) : null,
          county: attrs.COUNTY_NAME || null,
          rawAttributes: attrs,
        };
      }
    } catch (err) {
      console.warn("NYS ITS parcel query error:", err);
    }
  }

  // 3. If North Carolina (NC OneMap)
  if (isNC || (!isNY && !normState)) {
    try {
      const ncData = await runEsriQuery(
        "https://services.nconemap.gov/secure/rest/services/NC1Map_Parcels/MapServer/1/query",
        "gisacres,siteadd,ownname,parno,pin,cntynam,calcacres"
      );
      if (ncData?.features && ncData.features.length > 0) {
        const feat = ncData.features[0];
        const attrs = feat.attributes || {};
        let acres = attrs.gisacres || attrs.calcacres || null;
        if (acres === null && feat.geometry?.rings) {
          acres = calculateAcreageFromRings(feat.geometry.rings, lat);
        }
        const formattedAcres = acres ? Math.round(parseFloat(String(acres)) * 1000) / 1000 : null;
        const parcelId = attrs.parno || attrs.pin || attrs.parcel_id || null;

        return {
          parcelId,
          taxParcelId: parcelId,
          deedAcres: formattedAcres,
          acres: formattedAcres,
          primaryOwner: attrs.ownname || null,
          propertyClass: attrs.propclass || null,
          county: attrs.cntynam || null,
          rawAttributes: attrs,
        };
      }
    } catch (err) {
      console.warn("NC OneMap parcel query error:", err);
    }
  }

  // Fallback NYS query
  try {
    const fallbackNYS = await runEsriQuery(
      "https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Tax_Parcels_Public/MapServer/1/query",
      "*"
    );
    if (fallbackNYS?.features && fallbackNYS.features.length > 0) {
      const feat = fallbackNYS.features[0];
      const attrs = feat.attributes || {};
      const acresVal =
        attrs.ACRES ??
        attrs.CALC_ACRES ??
        (attrs.SQ_FT ? attrs.SQ_FT / 43560 : null);
      let finalAcres = acresVal ? parseFloat(String(acresVal)) : null;
      if (finalAcres === null && feat.geometry?.rings) {
        finalAcres = calculateAcreageFromRings(feat.geometry.rings, lat);
      }
      const formattedAcres = finalAcres ? Math.round(finalAcres * 1000) / 1000 : null;
      const parcelId = attrs.PRINT_KEY || attrs.SWIS_SBL_ID || attrs.SBL || null;
      return {
        parcelId,
        taxParcelId: parcelId,
        deedAcres: formattedAcres,
        acres: formattedAcres,
        primaryOwner: attrs.PRIMARY_OWNER || attrs.OWNER || null,
        propertyClass: attrs.PROP_CLASS ? String(attrs.PROP_CLASS) : null,
        county: attrs.COUNTY_NAME || null,
        rawAttributes: attrs,
      };
    }
  } catch {
    // Ignore fallback failure
  }

  return null;
}

/**
 * Step 3: Fetch Esri World Imagery Static Aerial Snapshot PNG Buffer
 */
export async function fetchSatelliteImageBuffer(
  lat: number,
  lon: number,
  customPad: number = PAD
): Promise<Buffer | null> {
  try {
    const minLon = lon - customPad;
    const minLat = lat - customPad;
    const maxLon = lon + customPad;
    const maxLat = lat + customPad;
    const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
    const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=800,600&format=png&f=image`;

    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      console.error(`Esri aerial imagery export failed with status ${res.status}`);
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err) {
    console.error("Failed to fetch satellite aerial image buffer:", err);
    return null;
  }
}

/**
 * Step 4: Save image buffer to local storage (/public/uploads/satellite/${recordId}.png) and optionally S3/MinIO
 */
export async function saveSatelliteImage(
  imageBuffer: Buffer,
  recordId: string,
  entityType: "ORDER" | "QUOTE" | "quote" | "order" = "ORDER"
): Promise<{ relativeUrl: string; s3Key?: string }> {
  const fileName = `${recordId}.png`;

  // Ensure public/uploads/satellite directory exists
  const publicUploadDir = path.join(process.cwd(), "public", "uploads", "satellite");
  await fs.promises.mkdir(publicUploadDir, { recursive: true });
  const localFilePath = path.join(publicUploadDir, fileName);
  await fs.promises.writeFile(localFilePath, imageBuffer);

  const relativeUrl = `/uploads/satellite/${fileName}`;
  const s3Key = `satellite/${entityType.toString().toLowerCase()}/${recordId}/${fileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: imageBuffer,
      ContentType: "image/png",
    });
    await s3Client.send(command);
  } catch (s3Err) {
    // Graceful fallback to local storage
  }

  return { relativeUrl, s3Key };
}

/**
 * Main Orchestrator: Enrich Property Data
 * Supports signature:
 * enrichPropertyData(recordId: string, type: 'quote' | 'order', address: string, statePrefix: string)
 * as well as object target signature.
 */
export async function enrichPropertyData(
  targetOrRecordId:
    | string
    | {
        id?: string;
        entityType?: "ORDER" | "QUOTE" | "order" | "quote";
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
        county?: string;
      },
  typeOrAddress?: "quote" | "order" | "QUOTE" | "ORDER" | string,
  addressOrCounty?: string,
  statePrefixOrState?: string
): Promise<any> {
  let recordId: string | null = null;
  let type: "quote" | "order" = "order";
  let address = "";
  let statePrefix = "";
  let city = "";
  let zip = "";
  let county = "";

  if (typeof targetOrRecordId === "string") {
    recordId = targetOrRecordId;
    const secondArg = (typeOrAddress || "").toLowerCase();
    if (secondArg === "quote" || secondArg === "order") {
      type = secondArg as "quote" | "order";
      address = addressOrCounty || "";
      statePrefix = statePrefixOrState || "";
    } else {
      // Legacy string call
      address = (typeOrAddress as string) || "";
      county = addressOrCounty || "";
      statePrefix = statePrefixOrState || "";
    }
  } else if (typeof targetOrRecordId === "object" && targetOrRecordId !== null) {
    recordId = targetOrRecordId.id || null;
    const eType = (targetOrRecordId.entityType || "order").toLowerCase();
    type = eType === "quote" ? "quote" : "order";
    address = targetOrRecordId.address || "";
    city = targetOrRecordId.city || "";
    statePrefix = targetOrRecordId.state || "";
    zip = targetOrRecordId.zip || "";
    county = targetOrRecordId.county || "";
  }

  // If recordId is provided, query existing DB record to fill in missing address or state
  let quoteRecord: any = null;
  let orderRecord: any = null;

  if (recordId) {
    if (type === "quote") {
      quoteRecord = await prisma.quote.findUnique({ where: { id: recordId } });
      if (quoteRecord) {
        address = address || quoteRecord.address;
        city = city || quoteRecord.city || "";
        statePrefix = statePrefix || quoteRecord.state || "";
        zip = zip || quoteRecord.zip || "";
        county = county || quoteRecord.county || "";
      }
    } else {
      orderRecord = await prisma.order.findUnique({ where: { id: recordId } });
      if (orderRecord) {
        address = address || orderRecord.address;
        city = city || orderRecord.city || "";
        statePrefix = statePrefix || orderRecord.state || "";
        zip = zip || orderRecord.zip || "";
        county = county || orderRecord.county || "";
      } else {
        // Check if it's a quote ID
        quoteRecord = await prisma.quote.findUnique({ where: { id: recordId } });
        if (quoteRecord) {
          type = "quote";
          address = address || quoteRecord.address;
          city = city || quoteRecord.city || "";
          statePrefix = statePrefix || quoteRecord.state || "";
          zip = zip || quoteRecord.zip || "";
          county = county || quoteRecord.county || "";
        }
      }
    }
  }

  const fullAddressParts = [address, city, statePrefix, zip].filter(Boolean).join(", ");
  const queryAddress = fullAddressParts || address;

  if (!queryAddress) {
    throw new Error("Cannot enrich property: No address provided");
  }

  // 1. Geocoding
  const geocode = await geocodeAddress(queryAddress);
  const lat = geocode?.latitude ?? (orderRecord?.latitude || quoteRecord?.latitude || null);
  const lon = geocode?.longitude ?? (orderRecord?.longitude || quoteRecord?.longitude || null);
  const detectedState = statePrefix || geocode?.state || "";
  const detectedCounty = county || geocode?.county || "";

  let parcelInfo: ParcelInfo | null = null;
  let satelliteImagePath: string | null = null;

  if (lat !== null && lon !== null) {
    // 2. Parcel Query
    parcelInfo = await queryParcelData(lat, lon, detectedState, detectedCounty);

    // 3. Aerial Satellite Snapshot
    const imageBuffer = await fetchSatelliteImageBuffer(lat, lon);
    if (imageBuffer && recordId) {
      const saved = await saveSatelliteImage(imageBuffer, recordId, type);
      satelliteImagePath = saved.relativeUrl;

      // Optional document record
      try {
        await prisma.document.create({
          data: {
            fileName: `Aerial Satellite Map - ${queryAddress.slice(0, 30)}.png`,
            s3Key: saved.s3Key || saved.relativeUrl,
            mimeType: "image/png",
            docType: "Aerial",
            orderId: type === "order" ? recordId : null,
            quoteId: type === "quote" ? recordId : null,
          },
        });
      } catch (e) {
        // Document table insertion is non-blocking
      }
    }
  }

  const finalParcelId =
    parcelInfo?.parcelId ||
    parcelInfo?.taxParcelId ||
    orderRecord?.parcelId ||
    orderRecord?.taxParcelId ||
    quoteRecord?.parcelId ||
    quoteRecord?.taxParcelId ||
    null;

  const finalAcres =
    parcelInfo?.deedAcres ??
    parcelInfo?.acres ??
    (type === "order" ? orderRecord?.deedAcres ?? orderRecord?.acres : quoteRecord?.deedAcres ?? quoteRecord?.acres) ??
    null;

  const finalOwner =
    parcelInfo?.primaryOwner ||
    (type === "order" ? orderRecord?.primaryOwner : quoteRecord?.primaryOwner) ||
    null;

  const finalPropertyClass =
    parcelInfo?.propertyClass ||
    (type === "order" ? orderRecord?.propertyClass : quoteRecord?.propertyClass) ||
    null;

  const finalCounty = parcelInfo?.county || detectedCounty || null;

  let updatedRecord: any = null;

  // 4. Update Database
  if (recordId) {
    if (type === "order") {
      updatedRecord = await prisma.order.update({
        where: { id: recordId },
        data: {
          ...(lat !== null && { latitude: lat }),
          ...(lon !== null && { longitude: lon }),
          ...(finalParcelId && { parcelId: finalParcelId, taxParcelId: finalParcelId }),
          ...(finalAcres !== null && { deedAcres: finalAcres, acres: finalAcres }),
          ...(finalOwner && { primaryOwner: finalOwner }),
          ...(finalPropertyClass && { propertyClass: finalPropertyClass }),
          ...(finalCounty && { county: finalCounty }),
          ...(satelliteImagePath && { satelliteImagePath }),
        },
        include: {
          surveyType: true,
          assignedUser: true,
          marketer: true,
          client: true,
          spoke: true,
          documents: { orderBy: { uploadedAt: "desc" } },
        },
      });
    } else {
      updatedRecord = await prisma.quote.update({
        where: { id: recordId },
        data: {
          ...(lat !== null && { latitude: lat }),
          ...(lon !== null && { longitude: lon }),
          ...(finalParcelId && { parcelId: finalParcelId, taxParcelId: finalParcelId }),
          ...(finalAcres !== null && { deedAcres: finalAcres, acres: finalAcres }),
          ...(finalOwner && { primaryOwner: finalOwner }),
          ...(finalPropertyClass && { propertyClass: finalPropertyClass }),
          ...(finalCounty && { county: finalCounty }),
          ...(satelliteImagePath && { satelliteImagePath }),
        },
        include: {
          surveyType: true,
          csr: true,
          marketer: true,
          client: true,
          spoke: true,
          documents: { orderBy: { uploadedAt: "desc" } },
        },
      });
    }
  }

  return updatedRecord || {
    latitude: lat,
    longitude: lon,
    parcelId: finalParcelId,
    taxParcelId: finalParcelId,
    deedAcres: finalAcres,
    acres: finalAcres,
    primaryOwner: finalOwner,
    propertyClass: finalPropertyClass,
    satelliteImagePath: satelliteImagePath || (type === "order" ? orderRecord?.satelliteImagePath : quoteRecord?.satelliteImagePath) || null,
    county: finalCounty,
    state: detectedState,
  };
}
