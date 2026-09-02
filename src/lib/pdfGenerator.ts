import { jsPDF } from "jspdf";

export interface PDFQuoteData {
  id: string;
  quoteNumber: number;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude?: number | null;
  longitude?: number | null;
  price: string | number;
  status: string;
  customScope?: string | null;
  includedFeatures?: any;
  excludedFeatures?: any;
  createdAt: string;
  surveyType?: {
    name: string;
    defaultPrice?: string | number;
  };
  csr?: {
    name: string;
    email?: string;
  } | null;
}

export function buildQuotePDFDoc(quote: PDFQuoteData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner Background
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 38, "F");

  // Company Branding
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("MJS LAND SURVEYING & MAPPING", margin, 16);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text("Professional Land Surveying & Boundary Solutions", margin, 23);
  doc.text("Phone: (800) 555-SURV  •  Email: quotes@mjslandsurvey.com", margin, 28);

  // Proposal Title & Reference Box (Right aligned)
  doc.setTextColor(59, 130, 246); // Blue 500
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("SURVEY PROPOSAL", pageWidth - margin, 16, { align: "right" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`Quote #${quote.quoteNumber}`, pageWidth - margin, 23, { align: "right" });

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, pageWidth - margin, 28, { align: "right" });

  // Section 1: Client & Job Location Cards
  let y = 46;

  // Left Column: Client Details Card
  const colWidth = (contentWidth - 6) / 2;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, colWidth, 38, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("CLIENT INFORMATION", margin + 4, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Name: ${quote.clientName}`, margin + 4, y + 14);
  doc.text(`Email: ${quote.clientEmail || "N/A"}`, margin + 4, y + 20);
  doc.text(`Phone: ${quote.clientPhone || "N/A"}`, margin + 4, y + 26);
  if (quote.csr) {
    doc.text(`CSR Specialist: ${quote.csr.name}`, margin + 4, y + 32);
  }

  // Right Column: Property Location Card
  const rightColX = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightColX, y, colWidth, 38, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("PROPERTY LOCATION", rightColX + 4, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Address: ${quote.address}`, rightColX + 4, y + 14);
  doc.text(`City/ST/Zip: ${quote.city}, ${quote.state} ${quote.zip}`, rightColX + 4, y + 20);
  if (quote.latitude && quote.longitude) {
    doc.text(`GPS: ${quote.latitude.toFixed(5)}, ${quote.longitude.toFixed(5)}`, rightColX + 4, y + 26);
  } else {
    doc.text("GPS: Field verification required", rightColX + 4, y + 26);
  }
  doc.text(`Service: ${quote.surveyType?.name || "Boundary Survey"}`, rightColX + 4, y + 32);

  // Section 2: Specific Scope of Work (if present)
  y = 90;
  if (quote.customScope && quote.customScope.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("SPECIFIC SCOPE OF WORK & SPECIAL INSTRUCTIONS", margin, y);

    y += 4;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);

    const splitScope = doc.splitTextToSize(quote.customScope.trim(), contentWidth - 8);
    const scopeBoxHeight = Math.max(14, splitScope.length * 4.5 + 6);

    doc.roundedRect(margin, y, contentWidth, scopeBoxHeight, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(splitScope, margin + 4, y + 6);

    y += scopeBoxHeight + 6;
  }

  // Section 3: Inclusions & Exclusions Side by Side
  const incList: string[] = Array.isArray(quote.includedFeatures)
    ? quote.includedFeatures
    : [];
  const excList: string[] = Array.isArray(quote.excludedFeatures)
    ? quote.excludedFeatures
    : [];

  const maxItems = Math.max(incList.length, excList.length, 1);
  const featureBoxHeight = Math.max(28, maxItems * 5.5 + 12);

  // Inclusions Box (Left)
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.setDrawColor(187, 247, 208); // Emerald 200
  doc.roundedRect(margin, y, colWidth, featureBoxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52); // Emerald 800
  doc.text("✓ INCLUDED DELIVERABLES & SERVICES", margin + 4, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61); // Emerald 700
  let incY = y + 13;
  if (incList.length > 0) {
    incList.forEach((item) => {
      const splitItem = doc.splitTextToSize(`• ${item}`, colWidth - 8);
      doc.text(splitItem, margin + 4, incY);
      incY += splitItem.length * 4.5;
    });
  } else {
    doc.text("• Standard professional survey plat deliverables", margin + 4, incY);
  }

  // Exclusions Box (Right)
  doc.setFillColor(254, 242, 242); // Rose 50
  doc.setDrawColor(254, 205, 205); // Rose 200
  doc.roundedRect(rightColX, y, colWidth, featureBoxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(153, 27, 27); // Rose 800
  doc.text("✗ EXCLUDED / OUT-OF-SCOPE ITEMS", rightColX + 4, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(185, 28, 28); // Rose 700
  let excY = y + 13;
  if (excList.length > 0) {
    excList.forEach((item) => {
      const splitItem = doc.splitTextToSize(`• ${item}`, colWidth - 8);
      doc.text(splitItem, rightColX + 4, excY);
      excY += splitItem.length * 4.5;
    });
  } else {
    doc.text("• Subsurface utility location, permit fees excluded", rightColX + 4, excY);
  }

  y += featureBoxHeight + 6;

  // Section 4: Pricing Breakdown & Total
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("SERVICE TYPE", margin + 6, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(quote.surveyType?.name || "Boundary Survey", margin + 6, y + 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL ESTIMATE:", pageWidth - margin - 45, y + 9);

  doc.setFontSize(15);
  doc.setTextColor(37, 99, 235); // Blue 600
  doc.text(`$${Number(quote.price).toFixed(2)}`, pageWidth - margin - 6, y + 16, { align: "right" });

  y += 28;

  // Section 5: Terms & Client Authorization Signature
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("TERMS & CONDITIONS", margin, y);

  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("1. Quote valid for 30 calendar days from issue date. Payment is due upon completion and prior to final sealed release.", margin, y);
  doc.text("2. Client grants surveyor access to property. Underground utilities located via 811 marking; private lines require separate locate.", margin, y + 3.5);

  y += 10;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin, y + 10, margin + colWidth, y + 10);
  doc.line(rightColX, y + 10, rightColX + colWidth, y + 10);

  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "bold");
  doc.text("Authorized Surveyor Representative", margin, y + 14);
  doc.text("Client Authorization Signature", rightColX, y + 14);

  doc.setFont("helvetica", "normal");
  doc.text("MJS Land Surveying LLC", margin, y + 18);
  doc.text("Date: ________________________", rightColX, y + 18);

  // Footer Note
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `MJS Survey Management System  •  Proposal Quote #${quote.quoteNumber}  •  Page 1 of 1`,
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" }
  );

  return doc;
}

export function generateQuotePDF(quote: PDFQuoteData) {
  const doc = buildQuotePDFDoc(quote);
  const cleanClientName = (quote.clientName || "Client").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Proposal-Quote-${quote.quoteNumber}-${cleanClientName}.pdf`);
}
