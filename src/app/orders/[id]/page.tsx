"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRole } from "@/context/RoleContext";
import { Role } from "@prisma/client";
import { hasFinancialAccess } from "@/lib/rbac";
import {
  ArrowLeft,
  CheckCircle,
  FileCheck,
  MapPin,
  User,
  AlertCircle,
  Save,
  Clock,
  Compass,
  FileText,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Receipt,
  Users,
  Calendar,
  Paperclip,
  Upload,
  ExternalLink,
  Loader2,
  History,
  Mail,
  MessageSquare,
  X,
} from "lucide-react";
import FileUpload from "@/components/FileUpload";

interface AttachmentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploader?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  createdAt: string;
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

interface ClientData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  clientType: string;
  defaultInvoiceRules: string | null;
  specialInstructions: string | null;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  clientName: string;
  clientId?: string | null;
  client?: ClientData | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: "FIELD_PENDING" | "DRAFTING" | "REVIEW" | "COMPLETED" | string;
  fieldNotes: string | null;
  fieldDueDate?: string | null;
  createdAt: string;
  surveyType: { id: string; name: string };
  assignedUser: { id: string; name: string; role: string; email: string } | null;
  marketerId?: string | null;
  marketer?: { id: string; name: string; role?: string; email?: string } | null;
  spoke?: { id: string; name: string; shortName: string } | null;
  quoteId?: string | null;
  quote?: {
    id: string;
    quoteNumber: number;
    price: string | number;
    client?: ClientData | null;
  } | null;
  documents: Array<{
    id: string;
    fileName: string;
    docType: string;
    uploadedAt: string;
    s3Key: string;
  }>;
}

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { role } = useRole();
  const { data: session } = useSession();
  const canViewFinancials = hasFinancialAccess(session?.user?.role || role);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [fieldNotes, setFieldNotes] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Email Client Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailModalError, setEmailModalError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrder();
      fetchUsers();
      fetchAttachments();
      fetchAuditLogs();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const data: OrderDetail = await res.json();
        setOrder(data);
        setFieldNotes(data.fieldNotes || "");
      } else {
        setError("Failed to load order details.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching the order.");
    } finally {
      setLoading(false);
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
      console.error(err);
    }
  };

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/orders/${id}/attachments`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data);
      }
    } catch (err) {
      console.error("Failed to load attachments:", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`/api/orders/${id}/audit`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAttachment(true);
      setAttachmentError(null);

      // 1. Request presigned upload URL & create Attachment record
      const presignRes = await fetch(`/api/orders/${id}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
        }),
      });

      if (!presignRes.ok) {
        const errData = await presignRes.json();
        throw new Error(errData.error || "Failed to initialize upload.");
      }

      const { uploadUrl } = await presignRes.json();

      // 2. PUT file directly to MinIO / S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Direct upload to storage failed.");
      }

      // 3. Reload attachments
      await fetchAttachments();
      setSuccessMessage(`Attachment "${file.name}" uploaded successfully.`);
    } catch (err: any) {
      console.error(err);
      setAttachmentError(err.message || "Failed to upload attachment.");
    } finally {
      setUploadingAttachment(false);
      e.target.value = "";
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setError(null);
      setSuccessMessage(null);
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setOrder(updated);
      fetchAuditLogs();
      setSuccessMessage(`Order status updated to ${newStatus.replace("_", " ")}`);
    } catch (err: any) {
      setError(err.message || "Failed to update order status.");
    }
  };

  const handleSaveFieldNotes = async () => {
    try {
      setSavingNotes(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldNotes }),
      });

      if (!res.ok) throw new Error("Failed to save field notes");
      const updated = await res.json();
      setOrder(updated);
      fetchAuditLogs();
      setSuccessMessage("Field notes successfully saved.");
    } catch (err: any) {
      setError(err.message || "Failed to save field notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAssignUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId: userId || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
        fetchAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignMarketer = async (marketerId: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketerId: marketerId || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
        fetchAuditLogs();
        setSuccessMessage("Marketer assignment successfully updated.");
      }
    } catch (err) {
      console.error("Failed to assign marketer:", err);
    }
  };

  const parseTemplate = (text: string, currentOrder: OrderDetail) => {
    if (!text) return "";
    const clientName = currentOrder.client?.name || currentOrder.clientName || "";
    const clientEmail = currentOrder.client?.email || currentOrder.quote?.client?.email || "";
    const clientPhone = currentOrder.client?.phone || currentOrder.quote?.client?.phone || "";
    const orderId = currentOrder.orderNumber || currentOrder.id || "";
    const propertyAddress = currentOrder.address || "";
    const surveyType = currentOrder.surveyType?.name || "";
    const price = currentOrder.quote?.price ? `$${Number(currentOrder.quote.price).toFixed(2)}` : "";
    const spokeName = currentOrder.spoke?.name || "";
    const quoteLink = currentOrder.quoteId && typeof window !== "undefined"
      ? `${window.location.origin}/quotes/${currentOrder.quoteId}`
      : "";

    return text
      .replace(/{{clientName}}/g, clientName)
      .replace(/{{clientEmail}}/g, clientEmail)
      .replace(/{{clientPhone}}/g, clientPhone)
      .replace(/{{orderId}}/g, orderId)
      .replace(/{{propertyAddress}}/g, propertyAddress)
      .replace(/{{surveyType}}/g, surveyType)
      .replace(/{{price}}/g, price)
      .replace(/{{spokeName}}/g, spokeName)
      .replace(/{{quoteLink}}/g, quoteLink);
  };

  const handleOpenEmailModal = async () => {
    if (!order) return;
    setIsEmailModalOpen(true);
    setEmailModalError(null);
    setLoadingTemplate(true);
    try {
      const res = await fetch("/api/admin/templates?type=ORDER_MANUAL_UPDATE");
      if (res.ok) {
        const data = await res.json();
        const parsedSubject = parseTemplate(data.subject || "", order);
        const parsedBody = parseTemplate(data.body || "", order);
        setEmailSubject(parsedSubject);
        setEmailBody(parsedBody);
      } else {
        setEmailSubject(`Update regarding your survey project for ${order.address} (Order #${order.orderNumber})`);
        setEmailBody(
          `Hello ${order.client?.name || order.clientName},\n\nWe are writing to provide you with an update regarding your survey project for ${order.address}.\n\nOrder Details:\n- Order #: ${order.orderNumber}\n- Survey Type: ${order.surveyType?.name}\n- Branch: ${order.spoke?.name || ""}\n\nPlease feel free to reply directly to this email if you have any questions.\n\nBest regards,\nMJS Land Surveying Team`
        );
      }
    } catch (err: any) {
      console.error("Failed to load email template:", err);
      setEmailModalError("Failed to load email template. You may compose manually.");
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    try {
      setSendingEmail(true);
      setEmailModalError(null);
      const res = await fetch(`/api/orders/${id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject, body: emailBody }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email to client.");
      }

      setIsEmailModalOpen(false);
      setSuccessMessage(data.message || "Email successfully sent to client.");
      fetchOrder();
      fetchAuditLogs();
    } catch (err: any) {
      setEmailModalError(err.message || "Failed to send email.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleUpdateDueDate = async (newDueDate: string) => {
    try {
      setError(null);
      setSuccessMessage(null);
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldDueDate: newDueDate || null }),
      });

      if (!res.ok) throw new Error("Failed to update field due date");
      const updated = await res.json();
      setOrder(updated);
      fetchAuditLogs();
      setSuccessMessage("Field due date successfully updated.");
    } catch (err: any) {
      setError(err.message || "Failed to update field due date.");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-3" />
        <p className="text-sm">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Order Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">The requested work order could not be located.</p>
        <Link
          href="/orders"
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Orders
        </Link>
      </div>
    );
  }

  const effectiveClient = order.client || order.quote?.client;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FIELD_PENDING":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Compass className="w-3.5 h-3.5 mr-1" />
            FIELD PENDING
          </span>
        );
      case "DRAFTING":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Clock className="w-3.5 h-3.5 mr-1" />
            DRAFTING
          </span>
        );
      case "REVIEW":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <FileCheck className="w-3.5 h-3.5 mr-1" />
            REVIEW
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/orders"
            className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Order {order.orderNumber}
              </h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Created on {new Date(order.createdAt).toLocaleDateString()}
              {order.quote && ` • Origin Quote #${order.quote.quoteNumber}`}
            </p>
          </div>
        </div>

        {/* Global Action / Sign-off */}
        {role === Role.SIGNING_SURVEYOR && order.status !== "COMPLETED" && (
          <button
            onClick={() => handleUpdateStatus("COMPLETED")}
            className="inline-flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-emerald-500"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark Completed & Sign Off
          </button>
        )}
      </div>

      {/* Alerts */}
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

      {/* Standing Client Instructions & Protocol Banner (if linked) */}
      {effectiveClient && (effectiveClient.specialInstructions || (effectiveClient.defaultInvoiceRules && canViewFinancials)) && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600 dark:text-amber-400" />
              Standing Protocols for {effectiveClient.name} ({effectiveClient.clientType})
            </span>
            {canViewFinancials && (
              <Link
                href={`/clients/${effectiveClient.id}`}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                View Client Profile →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-amber-950 dark:text-amber-100">
            {effectiveClient.defaultInvoiceRules && canViewFinancials && (
              <div className="bg-white/60 dark:bg-slate-900/60 p-2.5 rounded border border-amber-200 dark:border-amber-800/60">
                <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                  Billing Protocol:
                </span>
                {effectiveClient.defaultInvoiceRules}
              </div>
            )}
            {effectiveClient.specialInstructions && (
              <div className={`bg-white/60 dark:bg-slate-900/60 p-2.5 rounded border border-amber-200 dark:border-amber-800/60 ${!canViewFinancials ? "md:col-span-2" : ""}`}>
                <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                  Standing Field / Legal Instructions:
                </span>
                {effectiveClient.specialInstructions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Workflow Action Blocks */}
        <div className="md:col-span-2 space-y-6">
          {/* Role-Specific Action Panels */}

          {/* 1. FIELD WORKER PANEL */}
          {role === Role.FIELD_WORKER && (
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/60 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800/60 pb-3">
                <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200 font-bold text-base">
                  <Compass className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  <span>Field Worker Workflow</span>
                </div>
                <span className="text-xs bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-semibold px-2 py-0.5 rounded">
                  Status: {order.status}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-950 dark:text-amber-200 uppercase tracking-wider mb-1">
                  Field Notes & Observations
                </label>
                <textarea
                  rows={4}
                  value={fieldNotes}
                  onChange={(e) => setFieldNotes(e.target.value)}
                  placeholder="Record monument pins found, property lines, fence encroachments, benchmark elevations..."
                  className="w-full p-3 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleSaveFieldNotes}
                    disabled={savingNotes}
                    className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {savingNotes ? "Saving Notes..." : "Save Field Notes"}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-amber-200 dark:border-amber-800/60 space-y-3">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Upload Field Sheet & Hand Sketches
                </h4>
                <FileUpload
                  entityId={order.id}
                  entityType="ORDER"
                  defaultDocType="FieldSheet"
                  allowedDocTypes={["FieldSheet"]}
                  onUploadSuccess={fetchOrder}
                  buttonLabel="Upload Field Sheet"
                />
                {order.status === "FIELD_PENDING" && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleUpdateStatus("DRAFTING")}
                      className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                    >
                      Advance to CAD Drafting
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. DRAFTER PANEL */}
          {role === Role.DRAFTER && (
            <div className="bg-purple-50/70 dark:bg-purple-950/30 border-2 border-purple-300 dark:border-purple-700/60 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-purple-200 dark:border-purple-800/60 pb-3">
                <div className="flex items-center space-x-2 text-purple-900 dark:text-purple-200 font-bold text-base">
                  <Clock className="w-5 h-5 text-purple-700 dark:text-purple-400" />
                  <span>CAD Drafter Workflow</span>
                </div>
                <span className="text-xs bg-purple-200/80 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 font-semibold px-2 py-0.5 rounded">
                  Status: {order.status}
                </span>
              </div>

              <p className="text-xs text-purple-900 dark:text-purple-300">
                Review the field notes and uploaded field sheets below. Once CAD drawings / survey plats are generated, upload the Final Survey PDF/DWG and submit for Surveyor Review.
              </p>

              <div className="space-y-3 pt-2">
                <FileUpload
                  entityId={order.id}
                  entityType="ORDER"
                  defaultDocType="FinalSurvey"
                  allowedDocTypes={["FinalSurvey"]}
                  onUploadSuccess={fetchOrder}
                  buttonLabel="Upload Final Survey Plat (PDF/DWG)"
                />

                {order.status === "DRAFTING" && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleUpdateStatus("REVIEW")}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                    >
                      Submit for Surveyor Review
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. SIGNING SURVEYOR PANEL */}
          {role === Role.SIGNING_SURVEYOR && (
            <div className="bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-700/60 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-800/60 pb-3">
                <div className="flex items-center space-x-2 text-blue-900 dark:text-blue-200 font-bold text-base">
                  <FileCheck className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  <span>Signing Surveyor Review</span>
                </div>
                <span className="text-xs bg-blue-200/80 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 font-semibold px-2 py-0.5 rounded">
                  Status: {order.status}
                </span>
              </div>

              <p className="text-xs text-blue-900 dark:text-blue-300">
                Inspect boundary calculations, legal descriptions, and drafting deliverables before official stamp and seal.
              </p>

              {order.status !== "COMPLETED" && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleUpdateStatus("COMPLETED")}
                    className="inline-flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Approve & Complete Order
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Job & Location Information */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <MapPin className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Property & Client Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Client
                </span>
                <span className="text-base font-medium text-slate-900 dark:text-slate-100">{order.clientName}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Survey Type
                </span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{order.surveyType?.name}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Job Address
                </span>
                <span className="text-slate-800 dark:text-slate-200">
                  {order.address}, {order.city}, {order.state} {order.zip}
                </span>
              </div>
              {canViewFinancials && order.quote?.price && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Contract / Quote Value
                  </span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    ${Number(order.quote.price).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Client Communication Actions (Text & Email Client) */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {order.client?.phone ? (
                <a
                  href={`sms:${order.client.phone}`}
                  className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
                  Text Client
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="No client phone number on file"
                  className="inline-flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-800/40 text-slate-400 text-xs font-medium rounded-lg cursor-not-allowed opacity-60"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  Text Client
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenEmailModal}
                className="inline-flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
              >
                <Mail className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
                Email Client
              </button>
            </div>
          </div>

          {/* Attachments & Field Notes Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center">
                <Paperclip className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                Attachments & Field Notes ({attachments.length})
              </h2>

              {/* Upload Attachment Button */}
              <label className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition-colors">
                {uploadingAttachment ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload File
                  </>
                )}
                <input
                  type="file"
                  onChange={handleUploadAttachment}
                  disabled={uploadingAttachment}
                  className="hidden"
                />
              </label>
            </div>

            {attachmentError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{attachmentError}</span>
              </div>
            )}

            {/* Field Notes Text Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Field Observations & Log
                </label>
                {role !== Role.FIELD_WORKER && (
                  <button
                    onClick={handleSaveFieldNotes}
                    disabled={savingNotes}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                  >
                    {savingNotes ? "Saving..." : "Update Notes"}
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={fieldNotes}
                onChange={(e) => setFieldNotes(e.target.value)}
                placeholder="Record monument pins found, property lines, fence encroachments, benchmark elevations..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Uploaded Attachments List */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Uploaded Files & S3 Artifacts
              </h3>
              {attachments.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                  No attachments uploaded yet. Use the Upload File button above to add field photos, sketches, or CAD drawings.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/40">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          <span>{att.fileName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Uploaded by {att.uploader?.name || "Staff"} on {new Date(att.createdAt).toLocaleDateString()} at {new Date(att.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>

                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-colors"
                      >
                        <span>View / Download</span>
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Attached Documents with Direct MinIO/S3 FileUpload Component */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <FileCheck className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Job Documents & Plats ({order.documents?.length || 0})
            </h2>

            {/* Document List */}
            {order.documents && order.documents.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="py-2.5 flex items-center justify-between text-sm"
                  >
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{doc.fileName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{doc.docType}</span> • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
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
                No files or field sheets uploaded yet.
              </p>
            )}

            {/* General FileUpload Component */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <FileUpload
                entityId={order.id}
                entityType="ORDER"
                defaultDocType="FieldSheet"
                allowedDocTypes={["FieldSheet", "FinalSurvey", "Quote"]}
                onUploadSuccess={fetchOrder}
                buttonLabel="Upload file attachment"
              />
            </div>
          </div>
        </div>

        {/* Right Col: Workflow Status Controls & Assignment */}
        <div className="space-y-6">
          {/* Status Progression Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
              Workflow Status
            </h2>

            <div className="space-y-2">
              {[
                { key: "FIELD_PENDING", label: "1. Field Pending", icon: Compass },
                { key: "DRAFTING", label: "2. Drafting", icon: Clock },
                { key: "REVIEW", label: "3. Surveyor Review", icon: FileCheck },
                { key: "COMPLETED", label: "4. Completed", icon: CheckCircle2 },
              ].map((step) => {
                const isCurrent = order.status === step.key;
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => handleUpdateStatus(step.key)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold transition-colors border ${
                      isCurrent
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{step.label}</span>
                    {isCurrent && <CheckCircle className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field Due Date / Scheduling Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Field Due Date
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Target Field Date
              </label>
              <input
                type="date"
                value={
                  order.fieldDueDate
                    ? new Date(order.fieldDueDate).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) => handleUpdateDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Setting this schedules the order on the 14-day production calendar.
              </p>
            </div>

            {order.fieldDueDate && (
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
                <span className="font-semibold">Scheduled:</span>
                <span>
                  {new Date(order.fieldDueDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Assigned Staff Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center">
              <User className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Assigned Specialist
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Assign Worker
              </label>
              <select
                value={order.assignedUser?.id || ""}
                onChange={(e) => handleAssignUser(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Unassigned --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {order.assignedUser && (
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold block text-slate-900 dark:text-slate-100">{order.assignedUser.name}</span>
                <span className="text-slate-500 dark:text-slate-400">{order.assignedUser.email}</span>
                <span className="mt-1 inline-block px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">
                  {order.assignedUser.role}
                </span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Assigned Marketer (Commission)
              </label>
              <select
                value={order.marketer?.id || order.marketerId || ""}
                onChange={(e) => handleAssignMarketer(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {order.marketer && (
                <div className="mt-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-semibold block text-slate-900 dark:text-slate-100">{order.marketer.name}</span>
                  {order.marketer.email && (
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block">{order.marketer.email}</span>
                  )}
                  <span className="mt-1 inline-block px-2 py-0.5 bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 rounded text-[10px] font-mono">
                    MARKETER
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity History & Audit Timeline */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center">
            <History className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
            Activity History & Audit Timeline ({auditLogs.length})
          </h2>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
            No audit events recorded for this order yet.
          </p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {auditLogs.map((log) => (
              <div key={log.id} className="relative group">
                {/* Timeline node */}
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
                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mt-1">
                      {log.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email Client Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-bold text-base">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Email Client Update</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                disabled={sendingEmail}
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

            {loadingTemplate ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                Loading email template...
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Recipient
                  </span>
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-mono">
                    {order.client?.email || order.clientName}
                  </div>
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
                    placeholder="Subject line..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Message Body <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={8}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Enter message for client..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-sans focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEmailModalOpen(false)}
                    disabled={sendingEmail}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingEmail}
                    className="inline-flex items-center px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    {sendingEmail ? "Sending Email..." : "Send Email"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
