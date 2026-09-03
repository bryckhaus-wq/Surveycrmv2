"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  FileCheck,
  MapPin,
  User,
  AlertCircle,
  ArrowUpRight,
  Download,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Receipt,
  Users,
  Mail,
  Send,
  X,
  Loader2,
  History,
} from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { generateQuotePDF, buildQuotePDFDoc } from "@/lib/pdfGenerator";

interface ClientData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  clientType: string;
  defaultInvoiceRules: string | null;
  specialInstructions: string | null;
}

interface SpokeOption {
  id: string;
  name: string;
  shortName: string;
  state?: string | null;
}

interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  details: string | null;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  createdAt: string;
}

interface EmailLogItem {
  id: string;
  subject: string;
  body: string;
  sentTo: string;
  sentAt: string;
  quoteId?: string | null;
  orderId?: string | null;
}

interface QuoteDetail {
  id: string;
  quoteNumber: number;
  clientId?: string | null;
  client?: ClientData | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  county?: string | null;
  latitude: number | null;
  longitude: number | null;
  price: string | number;
  status: string;
  customScope?: string | null;
  includedFeatures?: string[] | null;
  excludedFeatures?: string[] | null;
  createdAt: string;
  surveyType: { id: string; name: string; defaultPrice: string | number };
  csr: { id: string; name: string; email: string } | null;
  marketerId?: string | null;
  marketer: { id: string; name: string; email: string; role?: string } | null;
  spokeId?: string | null;
  spoke?: { id: string; name: string; shortName: string } | null;
  convertedOrder: { id: string; orderNumber: string; status: string } | null;
  documents: Array<{
    id: string;
    fileName: string;
    docType: string;
    uploadedAt: string;
    s3Key: string;
  }>;
  emailLogs?: EmailLogItem[];
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string; role: string; email: string }>>([]);
  const [spokes, setSpokes] = useState<SpokeOption[]>([]);
  const [spokeId, setSpokeId] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [savingScope, setSavingScope] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Scope & Terms Editable State
  const [customScope, setCustomScope] = useState("");
  const [includedFeatures, setIncludedFeatures] = useState<string[]>([]);
  const [newInclusion, setNewInclusion] = useState("");
  const [excludedFeatures, setExcludedFeatures] = useState<string[]>([]);
  const [newExclusion, setNewExclusion] = useState("");

  // Email Proposal Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSendingStatus, setEmailSendingStatus] = useState<string | null>(null);
  const [emailModalError, setEmailModalError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchQuote();
      fetchUsers();
      fetchSpokes();
      fetchAuditLogs();
    }
  }, [id]);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`/api/quotes/${id}/audit`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch staff users:", err);
    }
  };

  const fetchSpokes = async () => {
    try {
      const res = await fetch("/api/admin/spokes");
      if (res.ok) {
        const data = await res.json();
        setSpokes(data);
      }
    } catch (err) {
      console.error("Failed to fetch spokes:", err);
    }
  };

  const fetchQuote = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quotes/${id}`);
      if (res.ok) {
        const data: QuoteDetail = await res.json();
        setQuote(data);
        setClientEmail(data.clientEmail || data.client?.email || "");
        setSpokeId(data.spokeId || data.spoke?.id || "");
        setCustomScope(data.customScope || "");
        setIncludedFeatures(
          Array.isArray(data.includedFeatures) ? data.includedFeatures : []
        );
        setExcludedFeatures(
          Array.isArray(data.excludedFeatures) ? data.excludedFeatures : []
        );
      } else {
        setError("Failed to load quote details.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching the quote.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-Spoke Matching: listen to Quote address or state
  useEffect(() => {
    if (!quote || spokes.length === 0) return;
    const textToMatch = `${quote.state || ""} ${quote.address || ""}`.toLowerCase();
    if (!textToMatch.trim()) return;

    const matchedSpoke = spokes.find((s) => {
      const sName = s.name.toLowerCase();
      const sShort = s.shortName.toLowerCase();
      const sState = (s.state || "").toLowerCase();

      if (sState && textToMatch.includes(sState)) return true;
      if (
        sShort &&
        (textToMatch.includes(` ${sShort} `) ||
          textToMatch.endsWith(` ${sShort}`) ||
          textToMatch === sShort ||
          textToMatch.includes(`, ${sShort}`))
      )
        return true;
      if (sName && textToMatch.includes(sName)) return true;

      // Common state mappings
      if (
        (textToMatch.includes("ny") || textToMatch.includes("new york")) &&
        (sShort === "ny" || sName.includes("new york") || sState === "ny")
      )
        return true;
      if (
        (textToMatch.includes("nc") || textToMatch.includes("north carolina")) &&
        (sShort === "nc" || sName.includes("north carolina") || sState === "nc")
      )
        return true;
      if (
        (textToMatch.includes("fl") || textToMatch.includes("florida")) &&
        (sShort === "fl" || sName.includes("florida") || sState === "fl")
      )
        return true;
      if (
        (textToMatch.includes("nj") || textToMatch.includes("new jersey")) &&
        (sShort === "nj" || sName.includes("new jersey") || sState === "nj")
      )
        return true;
      if (
        (textToMatch.includes("pa") || textToMatch.includes("pennsylvania")) &&
        (sShort === "pa" || sName.includes("pennsylvania") || sState === "pa")
      )
        return true;
      if (
        (textToMatch.includes("ga") || textToMatch.includes("georgia")) &&
        (sShort === "ga" || sName.includes("georgia") || sState === "ga")
      )
        return true;
      if (
        (textToMatch.includes("sc") || textToMatch.includes("south carolina")) &&
        (sShort === "sc" || sName.includes("south carolina") || sState === "sc")
      )
        return true;

      return false;
    });

    if (matchedSpoke && spokeId !== matchedSpoke.id) {
      setSpokeId(matchedSpoke.id);
      if (quote.spokeId !== matchedSpoke.id) {
        fetch(`/api/quotes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spokeId: matchedSpoke.id }),
        })
          .then(() => {
            setQuote((prev) =>
              prev
                ? {
                    ...prev,
                    spokeId: matchedSpoke.id,
                    spoke: matchedSpoke,
                  }
                : prev
            );
          })
          .catch((err) => console.error("Auto-spoke save failed:", err));
      }
    }
  }, [quote?.address, quote?.state, spokes]);

  const handleSaveClientEmail = async () => {
    try {
      setSavingEmail(true);
      setError(null);
      setSuccessMessage(null);
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientEmail: clientEmail.trim() }),
      });
      if (!res.ok) {
        throw new Error("Failed to update client email");
      }
      const updated = await res.json();
      setQuote(updated);
      fetchAuditLogs();
      setSuccessMessage("Client email updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to update client email.");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleAssignSpoke = async (newSpokeId: string) => {
    try {
      setSpokeId(newSpokeId);
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spokeId: newSpokeId || null }),
      });
      if (res.ok) {
        fetchQuote();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error("Failed to assign spoke branch:", err);
    }
  };

  const handleSaveScopeTerms = async () => {
    try {
      setSavingScope(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`/api/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customScope: customScope.trim() || null,
          includedFeatures,
          excludedFeatures,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save scope and terms");
      }

      const updated = await res.json();
      setQuote(updated);
      fetchAuditLogs();
      setSuccessMessage("Scope of work and terms updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to update scope.");
    } finally {
      setSavingScope(false);
    }
  };

  const handleAddInclusion = () => {
    if (newInclusion.trim()) {
      setIncludedFeatures([...includedFeatures, newInclusion.trim()]);
      setNewInclusion("");
    }
  };

  const handleRemoveInclusion = (index: number) => {
    setIncludedFeatures(includedFeatures.filter((_, i) => i !== index));
  };

  const handleAddExclusion = () => {
    if (newExclusion.trim()) {
      setExcludedFeatures([...excludedFeatures, newExclusion.trim()]);
      setNewExclusion("");
    }
  };

  const handleRemoveExclusion = (index: number) => {
    setExcludedFeatures(excludedFeatures.filter((_, i) => i !== index));
  };

  const handleConvertToOrder = async () => {
    if (!confirm("Are you sure you want to convert this quote into an active work order?")) {
      return;
    }

    try {
      setConverting(true);
      setError(null);

      const res = await fetch(`/api/quotes/${id}/convert`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to convert quote to order");
      }

      // Redirect to the newly created order
      router.push(`/orders/${data.orderId}`);
    } catch (err: any) {
      setError(err.message || "Failed to convert quote to order.");
      setConverting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchQuote();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleAssignMarketer = async (newMarketerId: string) => {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketerId: newMarketerId || null }),
      });
      if (res.ok) {
        fetchQuote();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error("Failed to assign marketer:", err);
    }
  };

  const handleDownloadPDF = () => {
    if (quote) {
      generateQuotePDF({
        ...quote,
        customScope,
        includedFeatures,
        excludedFeatures,
      });
    }
  };

  const handleOpenEmailModal = () => {
    if (!quote) return;
    setEmailTo(quote.clientEmail || quote.client?.email || "");
    setEmailSubject(`Survey Proposal from MJS Land Surveying - Quote #${quote.quoteNumber}`);
    setEmailMessage(
      `Dear ${quote.clientName},\n\nPlease find attached the official Survey Proposal for your project at ${quote.address}, ${quote.city}, ${quote.state}.\n\nTotal Investment: $${Number(quote.price).toFixed(2)}\n\nPlease feel free to contact our office with any questions or to authorize field scheduling.\n\nBest regards,\nMJS Land Surveying & Mapping`
    );
    setEmailModalError(null);
    setEmailSendingStatus(null);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;
    if (!emailTo.trim()) {
      setEmailModalError("Please enter a valid recipient email address.");
      return;
    }

    try {
      setEmailModalError(null);
      setEmailSendingStatus("Generating...");

      // Build PDF Base64
      const doc = buildQuotePDFDoc({
        ...quote,
        customScope,
        includedFeatures,
        excludedFeatures,
      });
      const pdfBase64 = doc.output("datauristring").split(",")[1];

      setEmailSendingStatus("Sending...");

      const res = await fetch(`/api/quotes/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64,
          toEmail: emailTo.trim(),
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email proposal.");
      }

      setIsEmailModalOpen(false);
      setSuccessMessage(`Proposal successfully emailed to ${emailTo.trim()}`);
      fetchQuote();
      fetchAuditLogs();
    } catch (err: any) {
      console.error("Email send error:", err);
      setEmailModalError(err.message || "Failed to send proposal via email.");
    } finally {
      setEmailSendingStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-3" />
        <p className="text-sm">Loading quote details...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-12 text-center text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Quote Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">The requested quote could not be located.</p>
        <Link
          href="/quotes"
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Quotes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/quotes"
            className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Quote #{quote.quoteNumber}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  quote.status === "WON"
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : quote.status === "LOST"
                    ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                    : "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                }`}
              >
                {quote.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Created on {new Date(quote.createdAt).toLocaleDateString()} at {new Date(quote.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Action Buttons: Email Proposal + PDF Download + Convert to Order */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenEmailModal}
            className="inline-flex items-center px-4 py-2.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-sm rounded-lg border border-blue-300 dark:border-blue-800 shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <Mail className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
            Email Proposal to Client
          </button>

          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <Download className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
            Download PDF Proposal
          </button>

          {quote.convertedOrder ? (
            <Link
              href={`/orders/${quote.convertedOrder.id}`}
              className="inline-flex items-center px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 font-semibold text-sm rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-sm"
            >
              <FileCheck className="w-4 h-4 mr-1.5" />
              View Order {quote.convertedOrder.orderNumber}
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Link>
          ) : (
            <button
              onClick={handleConvertToOrder}
              disabled={converting || quote.status === "WON"}
              className="inline-flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {converting ? "Converting to Order..." : "Convert to Order"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start space-x-3 text-emerald-800 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{successMessage}</div>
        </div>
      )}

      {/* Persistent Client Special Instructions & Billing Rules Banner */}
      {quote.client && (quote.client.specialInstructions || quote.client.defaultInvoiceRules) && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600 dark:text-amber-400" />
              Standing Protocols for {quote.client.name} ({quote.client.clientType})
            </span>
            <Link
              href={`/clients/${quote.client.id}`}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Client Profile →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-amber-950 dark:text-amber-100">
            {quote.client.defaultInvoiceRules && (
              <div className="bg-white/60 dark:bg-slate-900/60 p-2.5 rounded border border-amber-200 dark:border-amber-800/60">
                <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                  Billing & Invoicing Rules:
                </span>
                {quote.client.defaultInvoiceRules}
              </div>
            )}
            {quote.client.specialInstructions && (
              <div className="bg-white/60 dark:bg-slate-900/60 p-2.5 rounded border border-amber-200 dark:border-amber-800/60">
                <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                  Standing Field & Legal Instructions:
                </span>
                {quote.client.specialInstructions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Overview & Scope Editor */}
        <div className="md:col-span-2 space-y-6">
          {/* Client & Property Details */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center">
                <User className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                Client Information
              </h2>
              {quote.client && (
                <Link
                  href={`/clients/${quote.client.id}`}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center"
                >
                  <Users className="w-3.5 h-3.5 mr-1" />
                  Linked Account ({quote.client.clientType})
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Client Name
                </span>
                <span className="text-base font-medium text-slate-900 dark:text-slate-100">{quote.clientName}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Client Email(s) - comma separated
                </span>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={clientEmail}
                    onChange={(e) => {
                      setClientEmail(e.target.value);
                      setEmailTo(e.target.value);
                    }}
                    placeholder="client@example.com, closing@example.com"
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveClientEmail}
                    disabled={savingEmail}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                    title="Save Email"
                  >
                    {savingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Phone Number
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {quote.clientPhone || <span className="text-slate-400 dark:text-slate-600 italic">None</span>}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Assigned CSR
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {quote.csr ? `${quote.csr.name} (${quote.csr.email})` : <span className="text-slate-400 dark:text-slate-600 italic">Unassigned</span>}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Operating Branch (Spoke)
                </span>
                <select
                  value={spokeId}
                  onChange={(e) => handleAssignSpoke(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Branch / Spoke --</option>
                  {spokes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.shortName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Assigned Marketer
                </span>
                <select
                  value={quote.marketer?.id || quote.marketerId || ""}
                  onChange={(e) => handleAssignMarketer(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No Marketer / Direct --</option>
                  {(users.some((u) => u.role === "MARKETER")
                    ? users.filter((u) => u.role === "MARKETER")
                    : users
                  ).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Property Location */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <MapPin className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Property Location
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Street Address
                </span>
                <span className="text-base font-medium text-slate-900 dark:text-slate-100">{quote.address}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    City
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">{quote.city}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    State
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">{quote.state}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Zip Code
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">{quote.zip}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    County
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">{quote.county || <span className="text-slate-400 dark:text-slate-600 italic">None</span>}</span>
                </div>
              </div>
              {(quote.latitude !== null || quote.longitude !== null) && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-6 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span>Lat: {quote.latitude ?? "N/A"}</span>
                  <span>Lng: {quote.longitude ?? "N/A"}</span>
                  {quote.latitude && quote.longitude && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${quote.latitude},${quote.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                    >
                      Open in Maps <ArrowUpRight className="w-3 h-3 ml-0.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scope of Work & Proposal Terms Customizer */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                Scope of Work & Proposal Inclusions
              </h2>
              <button
                onClick={handleSaveScopeTerms}
                disabled={savingScope}
                className="inline-flex items-center px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                {savingScope ? "Saving..." : "Save Scope Changes"}
              </button>
            </div>

            {/* Custom Scope Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Specific Scope / Special Instructions
              </label>
              <textarea
                rows={3}
                value={customScope}
                onChange={(e) => setCustomScope(e.target.value)}
                placeholder="No special scope notes specified."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Inclusions & Exclusions Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Included Deliverables */}
              <div className="space-y-3 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                  Included Deliverables ({includedFeatures.length})
                </h3>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom inclusion..."
                    value={newInclusion}
                    onChange={(e) => setNewInclusion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddInclusion();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddInclusion}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {includedFeatures.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60"
                    >
                      <span>✓ {item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInclusion(idx)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Excluded Items */}
              <div className="space-y-3 bg-rose-50/40 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800">
                <h3 className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider flex items-center">
                  <XCircle className="w-4 h-4 mr-1.5 text-rose-600 dark:text-rose-400" />
                  Excluded Services ({excludedFeatures.length})
                </h3>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom exclusion..."
                    value={newExclusion}
                    onChange={(e) => setNewExclusion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddExclusion();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddExclusion}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {excludedFeatures.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60"
                    >
                      <span>✗ {item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExclusion(idx)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Attached Documents with Direct S3 FileUpload */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <FileCheck className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Attached Documents ({quote.documents?.length || 0})
            </h2>

            {/* Document List */}
            {quote.documents && quote.documents.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {quote.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="py-2.5 flex items-center justify-between text-sm"
                  >
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{doc.fileName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {doc.docType} • {new Date(doc.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic py-1">
                No documents uploaded yet for this quote.
              </p>
            )}

            {/* FileUpload Component */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <FileUpload
                entityId={quote.id}
                entityType="QUOTE"
                defaultDocType="Quote"
                allowedDocTypes={["Quote"]}
                onUploadSuccess={fetchQuote}
                buttonLabel="Upload quote document"
              />
            </div>
          </div>
        </div>

        {/* Right Col: Summary & Actions Card */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
              Quote Summary
            </h2>

            <div>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Survey Type
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block mt-0.5">
                {quote.surveyType?.name}
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Quoted Price
              </span>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5">
                ${Number(quote.price).toFixed(2)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                Change Status {quote.status === "WON" && <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">(Locked - WON)</span>}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={quote.status === "WON"}
                  onClick={() => handleStatusChange("NEW")}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    quote.status === "NEW"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  NEW
                </button>
                <button
                  type="button"
                  disabled={quote.status === "WON"}
                  onClick={() => handleStatusChange("LOST")}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    quote.status === "LOST"
                      ? "bg-rose-600 text-white border-rose-600"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  LOST
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Audit History */}
      <details className="group bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mt-8 shadow-sm">
        <summary className="cursor-pointer font-bold flex justify-between items-center text-gray-700 dark:text-slate-300 text-sm">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Audit History ({auditLogs.length})</span>
          </div>
          <span className="group-open:rotate-180 transition-transform text-xs">▼</span>
        </summary>
        <div className="mt-4 space-y-2 text-sm whitespace-pre-wrap">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
              No audit events recorded for this quote yet.
            </p>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="relative group">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {log.user?.name || "System"}
                      </span>
                      {log.user?.role && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                          {log.user.role.replace("_", " ")}
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-auto">
                        {new Date(log.createdAt).toLocaleDateString()} at{" "}
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 mt-1 whitespace-pre-wrap font-sans">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      {/* Collapsible Email History */}
      <details className="group bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mt-4 shadow-sm">
        <summary className="cursor-pointer font-bold flex justify-between items-center text-gray-700 dark:text-slate-300 text-sm">
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Email History ({quote.emailLogs?.length || 0})</span>
          </div>
          <span className="group-open:rotate-180 transition-transform text-xs">▼</span>
        </summary>
        <div className="mt-4 space-y-3 text-sm">
          {!quote.emailLogs || quote.emailLogs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
              No outgoing proposal emails logged for this quote yet.
            </p>
          ) : (
            <div className="space-y-3">
              {quote.emailLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        To: {log.sentTo}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(log.sentAt).toLocaleDateString()} at{" "}
                      {new Date(log.sentAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      {log.subject}
                    </span>
                    <div className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded border border-slate-100 dark:border-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {log.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      {/* Email Proposal Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-bold text-base">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Email Survey Proposal</span>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                disabled={!!emailSendingStatus}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {emailModalError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{emailModalError}</span>
              </div>
            )}

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Recipient Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Subject Line <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Message Body
                </label>
                <textarea
                  rows={5}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                  <FileText className="w-3.5 h-3.5 mr-1 text-blue-500" />
                  Attachment:
                </span>
                <span className="font-mono text-[11px]">Quote_Proposal.pdf</span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={!!emailSendingStatus}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!emailSendingStatus}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {emailSendingStatus ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      {emailSendingStatus}
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Send Proposal Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
