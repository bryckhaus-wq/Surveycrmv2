"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

interface QuoteData {
  id: string;
  quoteNumber: number;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  county?: string | null;
  price: number | string;
  status: string;
  customScope?: string | null;
  includedFeatures?: any;
  excludedFeatures?: any;
  createdAt: string;
  surveyType?: {
    id: string;
    name: string;
  } | null;
  client?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  spoke?: {
    id: string;
    name: string;
    shortName: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    lbNumber?: string | null;
  } | null;
}

interface SystemSettingsData {
  id: string;
  companyName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  themeColor?: string | null;
  proposalTerms?: string | null;
}

export default function QuoteProposalPage() {
  const params = useParams();
  const id = params.id as string;
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [settings, setSettings] = useState<SystemSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [quoteRes, settingsRes] = await Promise.all([
          fetch(`/api/quotes/${id}`),
          fetch("/api/admin/settings"),
        ]);
        if (!quoteRes.ok) throw new Error("Failed to load quote proposal details");
        const quoteData: QuoteData = await quoteRes.json();
        setQuote(quoteData);

        if (settingsRes.ok) {
          const settingsData: SystemSettingsData = await settingsRes.json();
          setSettings(settingsData);
        }
      } catch (err: any) {
        setError(err.message || "An error occurred fetching proposal data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (quote && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [quote, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black p-8 font-sans">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
          <p className="text-sm font-semibold tracking-wider uppercase">Generating Proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black p-8 font-sans">
        <div className="max-w-md w-full border border-black p-6 space-y-4">
          <div className="flex items-center space-x-2 text-rose-700">
            <AlertCircle className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wider">Proposal Error</h2>
          </div>
          <p className="text-sm">{error || "Unable to locate quote."}</p>
          <Link
            href={`/quotes/${id}`}
            className="inline-flex items-center text-xs font-bold border border-black px-3 py-1.5 hover:bg-black hover:text-white transition-colors uppercase"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Quote
          </Link>
        </div>
      </div>
    );
  }

  const price = Number(quote.price) || 0;
  const surveyTypeName = quote.surveyType?.name || "Professional Land Survey";

  return (
    <div className="min-h-screen bg-white text-black font-sans p-6 sm:p-12 print:p-0 print:m-0">
      {/* Screen Control Bar (Hidden on Print) */}
      <div className="max-w-3xl mx-auto mb-8 flex items-center justify-between border-b border-black pb-4 print:hidden">
        <Link
          href={`/quotes/${quote.id}`}
          className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-black hover:underline"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Quote #{quote.quoteNumber}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Standard 8.5x11 Paper Form Layout */}
      <div className="max-w-3xl mx-auto bg-white p-4 sm:p-8 print:p-0 print:max-w-none text-black">
        {/* Document Header */}
        <div className="grid grid-cols-2 gap-8 border-b-2 border-black pb-6 items-start">
          {/* Left Side: System Settings / Company Info */}
          <div className="space-y-2">
            {settings?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoUrl}
                alt={settings.companyName || "Logo"}
                className="max-h-14 object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">
                {settings?.companyName || quote.spoke?.name || "MJS LAND SURVEYING"}
              </h1>
              <div className="text-xs text-black mt-1 space-y-0.5">
                {settings?.address ? (
                  <p>{settings.address}</p>
                ) : (
                  <>
                    {quote.spoke?.address && <p>{quote.spoke.address}</p>}
                    {(quote.spoke?.city || quote.spoke?.state || quote.spoke?.zip) && (
                      <p>
                        {[quote.spoke.city, quote.spoke.state].filter(Boolean).join(", ")}{" "}
                        {quote.spoke.zip || ""}
                      </p>
                    )}
                  </>
                )}
                {settings?.phone && <p>Tel: {settings.phone}</p>}
                {settings?.email && <p>Email: {settings.email}</p>}
                {quote.spoke?.lbNumber && <p>LB #{quote.spoke.lbNumber}</p>}
              </div>
            </div>
          </div>

          {/* Right Side: Client Details & Quote Info */}
          <div className="text-right space-y-3">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-widest">PROPOSAL</h2>
              <div className="text-xs mt-1 space-y-0.5">
                <p>
                  <span className="font-bold">Quote #:</span> {quote.quoteNumber}
                </p>
                <p>
                  <span className="font-bold">Date:</span>{" "}
                  {new Date(quote.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="text-xs border-t border-black/30 pt-2 space-y-0.5">
              <p className="font-black uppercase tracking-wider text-black">Prepared For:</p>
              <p className="font-bold text-sm">{quote.client?.name || quote.clientName}</p>
              {quote.client?.address && <p>{quote.client.address}</p>}
              {(quote.clientEmail || quote.client?.email) && (
                <p>Email: {quote.clientEmail || quote.client?.email}</p>
              )}
              {(quote.clientPhone || quote.client?.phone) && (
                <p>Phone: {quote.clientPhone || quote.client?.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Property Information */}
        <div className="py-5 border-b border-black text-xs">
          <h3 className="font-black uppercase tracking-wider text-black mb-1.5">
            Subject Property Location:
          </h3>
          <p className="font-bold text-sm">
            {quote.address}, {quote.city}, {quote.state} {quote.zip}
          </p>
          {quote.county && <p className="text-zinc-700 mt-0.5">County: {quote.county}</p>}
        </div>

        {/* Itemized Services Table */}
        <div className="py-6">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2 font-black uppercase tracking-wider w-3/4">Scope of Survey Services</th>
                <th className="py-2 font-black uppercase tracking-wider text-right w-1/4">Proposed Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/20">
              <tr>
                <td className="py-4 pr-4 align-top">
                  <div className="font-bold text-sm">{surveyTypeName}</div>
                  <div className="text-xs text-zinc-700 mt-1">
                    Professional boundary and land surveying services provided for the property situated at{" "}
                    <span className="font-semibold text-black">{quote.address}</span>.
                  </div>
                  {quote.customScope && (
                    <div className="mt-2 text-xs text-zinc-800 whitespace-pre-wrap border-l-2 border-black pl-2.5 py-0.5">
                      {quote.customScope}
                    </div>
                  )}
                </td>
                <td className="py-4 text-right font-mono font-bold text-sm align-top">
                  ${price.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pricing Total */}
        <div className="border-t-2 border-black pt-4 flex justify-end">
          <div className="w-72 space-y-1 text-xs">
            <div className="flex justify-between pt-1 border-t-2 border-black text-base">
              <span className="font-black uppercase tracking-wider">Total Proposed Price:</span>
              <span className="font-mono font-black">${price.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Terms and Conditions Section */}
        {settings?.proposalTerms ? (
          <div className="mt-8 pt-5 border-t border-black text-xs">
            <h4 className="font-black uppercase tracking-wider text-black mb-2">
              Terms & Conditions:
            </h4>
            <div className="text-[11px] leading-relaxed text-zinc-800 whitespace-pre-wrap">
              {settings.proposalTerms}
            </div>
          </div>
        ) : (
          <div className="mt-8 pt-5 border-t border-black text-xs text-zinc-700 space-y-1">
            <p className="font-bold text-black uppercase">Standard Proposal Terms:</p>
            <p>
              This proposal is valid for 30 days from the date of issuance. Survey completion timelines are subject to weather and site accessibility.
            </p>
          </div>
        )}

        {/* Acceptance Sign-Off */}
        <div className="mt-10 pt-6 border-t-2 border-black text-xs space-y-6">
          <div className="flex justify-between items-end gap-8 pt-4">
            <div className="flex-1 border-b border-black pb-1">
              <p className="text-[10px] text-zinc-500 uppercase">Client Acceptance Signature</p>
            </div>
            <div className="w-48 border-b border-black pb-1">
              <p className="text-[10px] text-zinc-500 uppercase">Date</p>
            </div>
          </div>
          <p className="italic text-zinc-600 text-[11px]">
            Thank you for considering {settings?.companyName || quote.spoke?.name || "MJS Land Surveying"} for your surveying needs.
          </p>
        </div>
      </div>
    </div>
  );
}
