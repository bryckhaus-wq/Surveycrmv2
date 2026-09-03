"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

interface OrderData {
  id: string;
  orderNumber: string;
  clientName: string;
  orderedBy?: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  county?: string | null;
  taxParcelId?: string | null;
  lot?: string | null;
  block?: string | null;
  subdivision?: string | null;
  surveyType?: { id: string; name: string } | null;
  surveyTypeCustom?: string | null;
  surveyPrice?: number;
  miscAmt?: number;
  miscAmtDescription?: string | null;
  discountAmt?: number;
  depositPaid?: number;
  finalPaymentReceived?: number;
  taxRate?: number;
  clientDueDate?: string | null;
  completionDate?: string | null;
  createdAt: string;
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

export default function OrderInvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders/${id}`);
        if (!res.ok) throw new Error("Failed to load order invoice details");
        const data: OrderData = await res.json();
        setOrder(data);
      } catch (err: any) {
        setError(err.message || "An error occurred fetching invoice data");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (order && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [order, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black p-8 font-sans">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
          <p className="text-sm font-semibold tracking-wider uppercase">Generating Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black p-8 font-sans">
        <div className="max-w-md w-full border border-black p-6 space-y-4">
          <div className="flex items-center space-x-2 text-rose-700">
            <AlertCircle className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wider">Invoice Error</h2>
          </div>
          <p className="text-sm">{error || "Unable to locate order."}</p>
          <Link
            href={`/orders/${id}`}
            className="inline-flex items-center text-xs font-bold border border-black px-3 py-1.5 hover:bg-black hover:text-white transition-colors uppercase"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Order
          </Link>
        </div>
      </div>
    );
  }

  const surveyPrice = Number(order.surveyPrice) || 0;
  const miscAmt = Number(order.miscAmt) || 0;
  const discountAmt = Number(order.discountAmt) || 0;
  const depositPaid = Number(order.depositPaid) || 0;
  const finalPaymentReceived = Number(order.finalPaymentReceived) || 0;

  const subtotal = surveyPrice + miscAmt - discountAmt;
  const totalPaid = depositPaid + finalPaymentReceived;
  const balanceDue = subtotal - totalPaid;

  const surveyTypeName =
    order.surveyTypeCustom || order.surveyType?.name || "Professional Boundary Survey";

  return (
    <div className="min-h-screen bg-white text-black font-sans p-6 sm:p-12 print:p-0 print:m-0">
      {/* Screen Control Bar (Hidden on Print) */}
      <div className="max-w-3xl mx-auto mb-8 flex items-center justify-between border-b border-black pb-4 print:hidden">
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-black hover:underline"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Order #{order.orderNumber}
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
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase">
              {order.spoke?.name || "MJS LAND SURVEYING"}
            </h1>
            <div className="text-xs text-black mt-1 space-y-0.5">
              {order.spoke?.address && <p>{order.spoke.address}</p>}
              {(order.spoke?.city || order.spoke?.state || order.spoke?.zip) && (
                <p>
                  {[order.spoke.city, order.spoke.state].filter(Boolean).join(", ")}{" "}
                  {order.spoke.zip || ""}
                </p>
              )}
              {order.spoke?.lbNumber && <p>LB #{order.spoke.lbNumber}</p>}
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-3xl font-black uppercase tracking-widest">INVOICE</h2>
            <div className="text-xs mt-2 space-y-1">
              <p>
                <span className="font-bold">Invoice #:</span> {order.orderNumber}
              </p>
              <p>
                <span className="font-bold">Date:</span>{" "}
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              {order.clientDueDate && (
                <p>
                  <span className="font-bold">Due Date:</span>{" "}
                  {new Date(order.clientDueDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bill To & Property Address Info */}
        <div className="grid grid-cols-2 gap-8 py-6 border-b border-black text-xs">
          <div>
            <h3 className="font-black uppercase tracking-wider text-black mb-2 border-b border-black pb-1">
              Bill To:
            </h3>
            <div className="space-y-0.5">
              <p className="font-bold text-sm">{order.client?.name || order.clientName}</p>
              {order.orderedBy && (
                <p className="text-xs text-zinc-700">
                  <span className="font-semibold text-black">Ordered By:</span> {order.orderedBy}
                </p>
              )}
              {order.client?.address && <p>{order.client.address}</p>}
              {order.client?.phone && <p>Phone: {order.client.phone}</p>}
              {order.client?.email && <p>Email: {order.client.email}</p>}
            </div>
          </div>

          <div>
            <h3 className="font-black uppercase tracking-wider text-black mb-2 border-b border-black pb-1">
              Survey Property:
            </h3>
            <div className="space-y-0.5">
              <p className="font-bold">{order.address}</p>
              <p>
                {order.city}, {order.state} {order.zip}
              </p>
              {order.county && <p>County: {order.county}</p>}
              {order.taxParcelId && <p>Tax Parcel ID: {order.taxParcelId}</p>}
              {(order.lot || order.block || order.subdivision) && (
                <p>
                  {[
                    order.lot ? `Lot ${order.lot}` : null,
                    order.block ? `Block ${order.block}` : null,
                    order.subdivision || null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="py-6">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2 font-black uppercase tracking-wider w-3/4">Description</th>
                <th className="py-2 font-black uppercase tracking-wider text-right w-1/4">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/20">
              {/* Main Survey Line Item */}
              <tr>
                <td className="py-3 pr-4">
                  <div className="font-bold">{surveyTypeName}</div>
                  <div className="text-[11px] text-zinc-600">
                    Professional surveying services performed at {order.address}, {order.city},{" "}
                    {order.state} {order.zip}
                  </div>
                </td>
                <td className="py-3 text-right font-mono font-bold">
                  ${surveyPrice.toFixed(2)}
                </td>
              </tr>

              {/* Misc Surcharges (if present) */}
              {(miscAmt > 0 || order.miscAmtDescription) && (
                <tr>
                  <td className="py-3 pr-4">
                    <div className="font-bold">
                      {order.miscAmtDescription || "Miscellaneous / Expedited Fee"}
                    </div>
                  </td>
                  <td className="py-3 text-right font-mono font-bold">
                    ${miscAmt.toFixed(2)}
                  </td>
                </tr>
              )}

              {/* Discount Line Item (if present) */}
              {discountAmt > 0 && (
                <tr>
                  <td className="py-3 pr-4">
                    <div className="font-bold">Promotional / Volume Discount</div>
                  </td>
                  <td className="py-3 text-right font-mono font-bold">
                    -${discountAmt.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="border-t-2 border-black pt-4 flex justify-end">
          <div className="w-72 space-y-1.5 text-xs">
            <div className="flex justify-between py-0.5">
              <span className="font-semibold text-zinc-700">Subtotal:</span>
              <span className="font-mono font-bold">${subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-0.5">
              <span className="font-semibold text-zinc-700">Deposit Paid:</span>
              <span className="font-mono font-bold">-${depositPaid.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-0.5">
              <span className="font-semibold text-zinc-700">Final Payment Received:</span>
              <span className="font-mono font-bold">-${finalPaymentReceived.toFixed(2)}</span>
            </div>

            <div className="flex justify-between pt-2 border-t-2 border-black text-sm">
              <span className="font-black uppercase tracking-wider">Balance Due:</span>
              <span className="font-mono font-black">${balanceDue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Remittance & Instructions */}
        <div className="mt-12 pt-6 border-t border-black text-xs space-y-1 text-zinc-700">
          <p className="font-bold text-black uppercase">Payment Terms & Remittance Instructions:</p>
          <p>Please make all checks payable to: <span className="font-bold text-black">{order.spoke?.name || "MJS Land Surveying"}</span>.</p>
          <p>If you have any questions concerning this invoice, please reference Order #{order.orderNumber}.</p>
          <p className="pt-2 italic text-black font-semibold">Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
}
